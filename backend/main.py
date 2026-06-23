from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import aiosqlite
from typing import List, Optional

from database import init_db, get_db
from models import (
    Agent, Project, ProjectCreate,
    Task, TaskCreate, TaskUpdate, TaskClaim,
    Comment, CommentCreate, TaskEvent,
)

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://teams.basgod.com"],
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
            TASK_SELECT + " WHERE t.status = ? ORDER BY t.created_at ASC", (status,)
        )
    else:
        cursor = await db.execute(TASK_SELECT + " ORDER BY t.created_at DESC")
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

    await db.execute(
        "UPDATE tasks SET status='in_progress', session_id=?, agent_type=?, updated_at=datetime('now') WHERE id = ? AND status='pending'",
        (body.session_id, body.agent_type, task_id),
    )
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


@app.get("/api/agents/{agent_id}/stats")
async def agent_stats(agent_id: str, db: aiosqlite.Connection = Depends(get_db)):
    agent = next((a for a in AGENTS if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    cursor = await db.execute(
        "SELECT status, COUNT(*) as cnt FROM tasks WHERE assigned_agent = ? GROUP BY status",
        (agent_id,),
    )
    counts = {row["status"]: row["cnt"] for row in await cursor.fetchall()}

    recent_cursor = await db.execute(
        TASK_SELECT + " WHERE t.assigned_agent = ? ORDER BY t.updated_at DESC LIMIT 10",
        (agent_id,),
    )
    recent_tasks = [Task(**dict(row)) for row in await recent_cursor.fetchall()]

    return {
        "completed": counts.get("done", 0),
        "in_progress": counts.get("in_progress", 0),
        "pending": counts.get("pending", 0),
        "recent_tasks": recent_tasks,
    }


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
    return Comment(**dict(row))


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


@app.get("/health")
async def health():
    return {"status": "ok"}
