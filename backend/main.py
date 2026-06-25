from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import aiosqlite
import asyncio
import os
import subprocess
from typing import List, Optional

CLAUDE_BIN = "/home/pruthvi/.local/bin/claude"
FORCE_API = "https://teams.basgod.com/api"
DISPATCHER_LOG = "/tmp/force-dispatcher.log"

from database import init_db, get_db
import urllib.request
import json

from models import (
    Agent, Project, ProjectCreate,
    Task, TaskCreate, TaskUpdate, TaskClaim,
    Comment, CommentCreate, TaskEvent,
    ChatCreate, ChatReply,
    DirectChatMessage, DirectChatSend, DirectChatAgentReply,
)

OPENCLAW_HOOK = "http://127.0.0.1:18789/hooks/agent"
OPENCLAW_TOKEN = "force-hook-x9k2m7p4q1"


def _run_claude_in_background(prompt: str, cwd: str, env: dict) -> None:
    """Spawn claude subprocess; opens and closes the log file within the call."""
    with open(DISPATCHER_LOG, "a") as fh:
        subprocess.Popen(
            [CLAUDE_BIN, "--dangerously-skip-permissions", "--print", prompt],
            stdout=fh, stderr=fh, cwd=cwd, env=env,
        )


def _dispatch_to_hook(agent_id: str, message: str, name: str = "Force Chat", session_key: Optional[str] = None) -> bool:
    # deliver=False: the agent reports back to Force via curl (to /comments or
    # /direct/{sid}/reply), so OpenClaw must NOT try to deliver the agent's final
    # turn to a chat channel. Without this the hook run dies with
    # "Channel is required when multiple channels are configured" and the agent's
    # reply never completes.
    body: dict = {"message": message, "name": name, "agentId": agent_id, "deliver": False}
    if session_key:
        body["sessionKey"] = session_key
    payload = json.dumps(body).encode()
    req = urllib.request.Request(
        OPENCLAW_HOOK,
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {OPENCLAW_TOKEN}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            return r.status in (200, 201, 202)
    except Exception:
        return False

AGENTS: List[Agent] = [
    Agent(id="dev", name="Dev", role="Full-Stack Developer", model="claude-opus-4-8", status="idle"),
    Agent(id="researcher", name="Researcher", role="Research Analyst", model="claude-sonnet-4-6", status="idle"),
    Agent(id="support", name="Support", role="Internal Support", model="claude-haiku-4-5", status="idle"),
]

TASK_SELECT = """
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Force API", version="1.0.0", lifespan=lifespan)

_cors_origins = ["https://teams.basgod.com"]
if os.environ.get("FORCE_DEV"):
    _cors_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/agents", response_model=List[Agent])
async def list_agents(db: aiosqlite.Connection = Depends(get_db)):
    # An agent owns a task via assigned_agent, falling back to the agent_type
    # recorded when the task was claimed by the dispatcher.
    owner = "COALESCE(assigned_agent, agent_type)"

    # Reflect real working status from in_progress tasks
    cursor = await db.execute(
        f"SELECT {owner} AS owner, title FROM tasks WHERE status = 'in_progress'"
    )
    active = {row["owner"]: row["title"] for row in await cursor.fetchall()}

    # Tally how many tasks each agent has handled (completed) and total.
    cursor = await db.execute(
        f"SELECT {owner} AS owner, status, COUNT(*) AS cnt FROM tasks GROUP BY owner, status"
    )
    completed: dict = {}
    total: dict = {}
    for row in await cursor.fetchall():
        if row["owner"] is None:
            continue
        total[row["owner"]] = total.get(row["owner"], 0) + row["cnt"]
        if row["status"] == "done":
            completed[row["owner"]] = completed.get(row["owner"], 0) + row["cnt"]

    result = []
    for agent in AGENTS:
        a = agent.model_copy()
        if agent.id in active:
            a.status = "working"
            a.current_task = active[agent.id]
        a.tasks_completed = completed.get(agent.id, 0)
        a.tasks_total = total.get(agent.id, 0)
        result.append(a)
    return result


@app.get("/api/projects", response_model=List[Project])
async def list_projects(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("""
        SELECT p.*, COUNT(t.id) as task_count
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    """)
    rows = await cursor.fetchall()
    return [Project(**dict(row)) for row in rows]


@app.post("/api/projects", response_model=Project, status_code=201)
async def create_project(body: ProjectCreate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "INSERT INTO projects (name, description, repo_path) VALUES (?, ?, ?)",
        (body.name, body.description, body.repo_path),
    )
    await db.commit()
    row_cursor = await db.execute(
        "SELECT p.*, COUNT(t.id) as task_count FROM projects p LEFT JOIN tasks t ON t.project_id = p.id WHERE p.id = ? GROUP BY p.id",
        (cursor.lastrowid,),
    )
    row = await row_cursor.fetchone()
    return Project(**dict(row))


@app.get("/api/tasks", response_model=List[Task])
async def list_tasks(status: Optional[str] = None, db: aiosqlite.Connection = Depends(get_db)):
    if status:
        cursor = await db.execute(
            TASK_SELECT + " WHERE t.status = ? AND (t.is_chat = 0 OR t.is_chat IS NULL) ORDER BY t.created_at ASC", (status,)
        )
    else:
        cursor = await db.execute(TASK_SELECT + " WHERE (t.is_chat = 0 OR t.is_chat IS NULL) ORDER BY t.created_at DESC")
    rows = await cursor.fetchall()
    return [Task(**dict(row)) for row in rows]


@app.post("/api/tasks", response_model=Task, status_code=201)
async def create_task(body: TaskCreate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "INSERT INTO tasks (title, description, project_id, assigned_agent) VALUES (?, ?, ?, ?)",
        (body.title, body.description, body.project_id, body.assigned_agent),
    )
    await db.commit()
    row_cursor = await db.execute(
        TASK_SELECT + " WHERE t.id = ?", (cursor.lastrowid,)
    )
    row = await row_cursor.fetchone()
    return Task(**dict(row))


@app.post("/api/tasks/{task_id}/claim", response_model=Task)
async def claim_task(task_id: int, body: TaskClaim, db: aiosqlite.Connection = Depends(get_db)):
    """Atomically claim a pending task. Returns 409 if already claimed."""
    row = await (await db.execute(
        "SELECT status FROM tasks WHERE id = ?", (task_id,)
    )).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"Task already {row['status']}")

    update_cursor = await db.execute(
        "UPDATE tasks SET status='in_progress', session_id=?, agent_type=?, updated_at=datetime('now') WHERE id = ? AND status='pending'",
        (body.session_id, body.agent_type, task_id),
    )
    if update_cursor.rowcount == 0:
        raise HTTPException(status_code=409, detail="Task already claimed by another dispatcher")
    await db.execute(
        "INSERT INTO task_events (task_id, from_status, to_status, actor, session_id, note) VALUES (?, ?, ?, ?, ?, ?)",
        (task_id, "pending", "in_progress", body.agent_type, body.session_id, f"Claimed by {body.agent_type}"),
    )
    await db.commit()
    row_cursor = await db.execute(TASK_SELECT + " WHERE t.id = ?", (task_id,))
    row = await row_cursor.fetchone()
    return Task(**dict(row))


@app.patch("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: int, body: TaskUpdate, db: aiosqlite.Connection = Depends(get_db)):
    check = await (await db.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Task not found")

    prev = await (await db.execute("SELECT status, agent_type, session_id FROM tasks WHERE id = ?", (task_id,))).fetchone()

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [task_id]
    await db.execute(
        f"UPDATE tasks SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        values,
    )

    # Record event when status changes
    if "status" in fields and fields["status"] != prev["status"]:
        actor = fields.get("agent_type") or prev["agent_type"]
        session = fields.get("session_id") or prev["session_id"]
        await db.execute(
            "INSERT INTO task_events (task_id, from_status, to_status, actor, session_id) VALUES (?, ?, ?, ?, ?)",
            (task_id, prev["status"], fields["status"], actor, session),
        )

    await db.commit()

    row_cursor = await db.execute(TASK_SELECT + " WHERE t.id = ?", (task_id,))
    row = await row_cursor.fetchone()
    return Task(**dict(row))


@app.delete("/api/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db: aiosqlite.Connection = Depends(get_db)):
    check = await (await db.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.execute("DELETE FROM comments WHERE task_id = ?", (task_id,))
    await db.execute("DELETE FROM task_events WHERE task_id = ?", (task_id,))
    await db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    await db.commit()


@app.get("/api/agents/{agent_id}/stats")
async def agent_stats(agent_id: str, db: aiosqlite.Connection = Depends(get_db)):
    agent = next((a for a in AGENTS if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    cursor = await db.execute(
        "SELECT status, COUNT(*) as cnt FROM tasks WHERE COALESCE(assigned_agent, agent_type) = ? GROUP BY status",
        (agent_id,),
    )
    counts = {row["status"]: row["cnt"] for row in await cursor.fetchall()}

    recent_cursor = await db.execute(
        TASK_SELECT + " WHERE COALESCE(t.assigned_agent, t.agent_type) = ? ORDER BY t.updated_at DESC LIMIT 10",
        (agent_id,),
    )
    recent_tasks = [Task(**dict(row)) for row in await recent_cursor.fetchall()]

    return {
        "completed": counts.get("done", 0),
        "in_progress": counts.get("in_progress", 0),
        "pending": counts.get("pending", 0),
        "recent_tasks": recent_tasks,
    }


@app.get("/api/comments/recent")
async def recent_comments(since_id: Optional[int] = None, db: aiosqlite.Connection = Depends(get_db)):
    """Get recent agent comments for notifications. Excludes user/agent-request entries."""
    if since_id is not None:
        cursor = await db.execute(
            """SELECT c.id, c.task_id, t.title as task_title, c.author, c.body, c.created_at
               FROM comments c
               JOIN tasks t ON t.id = c.task_id
               WHERE c.id > ? AND c.author NOT IN ('user', 'agent-request')
               ORDER BY c.id DESC LIMIT 20""",
            (since_id,),
        )
    else:
        cursor = await db.execute(
            """SELECT c.id, c.task_id, t.title as task_title, c.author, c.body, c.created_at
               FROM comments c
               JOIN tasks t ON t.id = c.task_id
               WHERE c.author NOT IN ('user', 'agent-request')
               ORDER BY c.id DESC LIMIT 20"""
        )
    rows = await cursor.fetchall()
    return [
        {
            "id": r["id"],
            "task_id": r["task_id"],
            "task_title": r["task_title"],
            "author": r["author"],
            "body": r["body"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


@app.get("/api/tasks/{task_id}/comments", response_model=List[Comment])
async def list_comments(task_id: int, db: aiosqlite.Connection = Depends(get_db)):
    check = await (await db.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Task not found")
    cursor = await db.execute(
        "SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC", (task_id,)
    )
    rows = await cursor.fetchall()
    return [Comment(**dict(row)) for row in rows]


@app.post("/api/tasks/{task_id}/comments", response_model=Comment, status_code=201)
async def create_comment(task_id: int, body: CommentCreate, db: aiosqlite.Connection = Depends(get_db)):
    check = await (await db.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Task not found")
    cursor = await db.execute(
        "INSERT INTO comments (task_id, author, body) VALUES (?, ?, ?)",
        (task_id, body.author, body.body),
    )
    await db.commit()
    row = await (await db.execute(
        "SELECT * FROM comments WHERE id = ?", (cursor.lastrowid,)
    )).fetchone()
    comment = Comment(**dict(row))

    # When a human replies on a task, spawn an agent to respond
    if body.author == "agent-request":
        task_row = await (await db.execute(
            "SELECT agent_type, title FROM tasks WHERE id = ?", (task_id,)
        )).fetchone()
        agent_type = (task_row["agent_type"] if task_row else None) or "dev"
        prompt = (
            f"You are the {agent_type} agent working in Force, an AI team management system.\n\n"
            f"A human has replied on task #{task_id}. Here is the full context:\n\n"
            f"{body.body}\n\n"
            f"Read the context carefully and respond helpfully to the user's latest message.\n\n"
            f"When done, post your reply as a comment:\n"
            f'curl -s -X POST {FORCE_API}/tasks/{task_id}/comments '
            f'-H "Content-Type: application/json" '
            f"-d '{{\"author\": \"{agent_type}\", \"body\": \"YOUR_REPLY_HERE\"}}'\n\n"
            f"Rules:\n"
            f"- Do NOT message Pruthvi on Telegram or WhatsApp.\n"
            f"- All output goes to Force task comments only.\n"
            f"- Keep your reply focused and actionable."
        )
        env = os.environ.copy()
        env["PATH"] = f"/home/pruthvi/.local/bin:{env.get('PATH', '/usr/bin:/bin')}"
        asyncio.get_running_loop().run_in_executor(
            None, lambda: _run_claude_in_background(prompt, "/home/pruthvi/Projects", env)
        )

    return comment


@app.get("/api/tasks/{task_id}/events", response_model=List[TaskEvent])
async def list_events(task_id: int, db: aiosqlite.Connection = Depends(get_db)):
    check = await (await db.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Task not found")
    cursor = await db.execute(
        "SELECT * FROM task_events WHERE task_id = ? ORDER BY created_at ASC", (task_id,)
    )
    rows = await cursor.fetchall()
    return [TaskEvent(**dict(row)) for row in rows]


@app.get("/api/agents/{agent_id}/chats", response_model=List[Task])
async def list_chats(agent_id: str, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        TASK_SELECT + " WHERE t.assigned_agent = ? AND t.is_chat = 1 ORDER BY t.updated_at DESC LIMIT 20",
        (agent_id,),
    )
    rows = await cursor.fetchall()
    return [Task(**dict(row)) for row in rows]


@app.post("/api/agents/{agent_id}/chat", status_code=201)
async def start_chat(agent_id: str, body: ChatCreate, db: aiosqlite.Connection = Depends(get_db)):
    agent = next((a for a in AGENTS if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    cursor = await db.execute(
        "INSERT INTO tasks (title, assigned_agent, agent_type, status, is_chat) VALUES (?, ?, ?, 'in_progress', 1)",
        (f"Chat: {body.message[:60]}", agent_id, agent_id),
    )
    task_id = cursor.lastrowid
    await db.execute(
        "INSERT INTO comments (task_id, author, body) VALUES (?, 'user', ?)",
        (task_id, body.message),
    )
    await db.commit()

    # Session key ties this chat thread to a persistent OpenClaw session.
    # The agent accumulates full conversation history across follow-up messages.
    session_key = f"{agent_id}:chat:{task_id}"
    prompt = _build_chat_prompt(agent_id, agent.name, task_id, body.message)
    asyncio.get_running_loop().run_in_executor(
        None, lambda: _dispatch_to_hook(agent_id, prompt, f"Chat #{task_id}", session_key)
    )

    row = await (await db.execute(TASK_SELECT + " WHERE t.id = ?", (task_id,))).fetchone()
    return Task(**dict(row))


@app.post("/api/agents/{agent_id}/chat/{task_id}/reply", response_model=Comment, status_code=201)
async def reply_chat(agent_id: str, task_id: int, body: ChatReply, db: aiosqlite.Connection = Depends(get_db)):
    task = await (await db.execute("SELECT * FROM tasks WHERE id = ? AND assigned_agent = ? AND is_chat = 1", (task_id, agent_id))).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Chat thread not found")

    cursor = await db.execute(
        "INSERT INTO comments (task_id, author, body) VALUES (?, 'user', ?)",
        (task_id, body.message),
    )
    await db.execute("UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?", (task_id,))
    await db.commit()

    comment_row = await (await db.execute("SELECT * FROM comments WHERE id = ?", (cursor.lastrowid,))).fetchone()

    # Same session key as start_chat — OpenClaw already has the full history.
    session_key = f"{agent_id}:chat:{task_id}"
    agent = next((a for a in AGENTS if a.id == agent_id), None)
    asyncio.get_running_loop().run_in_executor(
        None, lambda: _dispatch_to_hook(agent_id, body.message, f"Chat #{task_id}", session_key)
    )

    return Comment(**dict(comment_row))


def _build_chat_prompt(agent_id: str, agent_name: str, task_id: int, message: str) -> str:
    return f"""You are {agent_name}, a live AI assistant. A user is chatting with you directly in Force (an AI team management app).

User: {message}

Respond naturally and conversationally. Be helpful and concise.

When done, post your reply with:
curl -s -X POST {FORCE_API}/tasks/{task_id}/comments \\
  -H "Content-Type: application/json" \\
  -d '{{"author": "{agent_id}", "body": "YOUR_REPLY_HERE"}}'

Rules:
- This is direct chat — be conversational, not task-management-y.
- Do NOT message anyone externally (Telegram, WhatsApp, etc).
- Keep replies focused. You are a persistent agent — the conversation history is in your session context.
"""


@app.post("/api/agents/{agent_id}/direct", response_model=List[DirectChatMessage], status_code=201)
async def direct_chat_start(agent_id: str, body: DirectChatSend, db: aiosqlite.Connection = Depends(get_db)):
    """Start a new direct chat session with an agent."""
    agent = next((a for a in AGENTS if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    import time
    session_id = f"{agent_id}-{int(time.time() * 1000)}"

    cursor = await db.execute(
        "INSERT INTO agent_direct_chats (agent_id, session_id, author, body) VALUES (?, ?, 'user', ?)",
        (agent_id, session_id, body.message),
    )
    await db.commit()
    msg_id = cursor.lastrowid

    session_key = f"{agent_id}:direct:{session_id}"
    prompt = _build_direct_chat_prompt(agent_id, agent.name, session_id, body.message)
    asyncio.get_running_loop().run_in_executor(
        None, lambda: _dispatch_to_hook(agent_id, prompt, f"Direct chat {session_id}", session_key)
    )

    row = await (await db.execute(
        "SELECT * FROM agent_direct_chats WHERE id = ?", (msg_id,)
    )).fetchone()
    return [DirectChatMessage(**dict(row))]


@app.get("/api/agents/{agent_id}/direct/{session_id}", response_model=List[DirectChatMessage])
async def direct_chat_messages(agent_id: str, session_id: str, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM agent_direct_chats WHERE agent_id = ? AND session_id = ? ORDER BY created_at ASC",
        (agent_id, session_id),
    )
    rows = await cursor.fetchall()
    return [DirectChatMessage(**dict(r)) for r in rows]


@app.post("/api/agents/{agent_id}/direct/{session_id}", response_model=DirectChatMessage, status_code=201)
async def direct_chat_send(agent_id: str, session_id: str, body: DirectChatSend, db: aiosqlite.Connection = Depends(get_db)):
    """Send a follow-up message in an existing direct chat session."""
    agent = next((a for a in AGENTS if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    cursor = await db.execute(
        "INSERT INTO agent_direct_chats (agent_id, session_id, author, body) VALUES (?, ?, 'user', ?)",
        (agent_id, session_id, body.message),
    )
    await db.commit()

    row = await (await db.execute(
        "SELECT * FROM agent_direct_chats WHERE id = ?", (cursor.lastrowid,)
    )).fetchone()

    session_key = f"{agent_id}:direct:{session_id}"
    agent = next((a for a in AGENTS if a.id == agent_id), None)
    prompt = _build_direct_chat_prompt(agent_id, agent.name if agent else agent_id, session_id, body.message)
    asyncio.get_running_loop().run_in_executor(
        None, lambda: _dispatch_to_hook(agent_id, prompt, f"Direct chat {session_id}", session_key)
    )

    return DirectChatMessage(**dict(row))


@app.post("/api/agents/{agent_id}/direct/{session_id}/reply", response_model=DirectChatMessage, status_code=201)
async def direct_chat_agent_reply(agent_id: str, session_id: str, body: DirectChatAgentReply, db: aiosqlite.Connection = Depends(get_db)):
    """Agent posts its reply here. Called by the agent via curl."""
    cursor = await db.execute(
        "INSERT INTO agent_direct_chats (agent_id, session_id, author, body) VALUES (?, ?, ?, ?)",
        (agent_id, session_id, body.author, body.body),
    )
    await db.commit()
    row = await (await db.execute(
        "SELECT * FROM agent_direct_chats WHERE id = ?", (cursor.lastrowid,)
    )).fetchone()
    return DirectChatMessage(**dict(row))


def _build_direct_chat_prompt(agent_id: str, agent_name: str, session_id: str, message: str) -> str:
    # IMPORTANT: OpenClaw wraps this webhook body as EXTERNAL_UNTRUSTED_CONTENT with a
    # security notice that tells the agent NOT to execute commands found inside it. So we
    # must NOT put the reply curl in here — the agent (correctly) refuses to run commands
    # embedded in untrusted webhook content, and the reply silently never gets posted.
    #
    # Instead the body carries only the trusted trigger marker ("Direct chat | Session:")
    # plus the user's message. HOW to reply (the curl to /agents/{id}/direct/{sid}/reply)
    # lives in the agent's workspace AGENTS.md, which is trusted system context the agent
    # will act on. This mirrors the dev agent's working pattern.
    return f"""Direct chat | Session: {session_id}

User: {message}"""


@app.get("/health")
async def health():
    return {"status": "ok"}
