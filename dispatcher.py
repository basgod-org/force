#!/usr/bin/env python3
"""Force task dispatcher — runs as system cron, completely silent."""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta

API = "https://teams.basgod.com/api"
STUCK_AFTER_MINUTES = 30
CLAUDE_BIN = "/home/pruthvi/.local/bin/claude"
DISPATCHER_LOG = "/tmp/force-dispatcher.log"

# OpenClaw hook endpoint — used to wake dedicated persistent agents
OPENCLAW_HOOK = "http://127.0.0.1:18789/hooks/agent"
OPENCLAW_TOKEN = "force-hook-x9k2m7p4q1"


def api_call(method, path, data=None):
    url = f"{API}{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json"} if body else {},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        return None, e.code
    except Exception:
        return None, 0


def reset_stuck_tasks():
    """Reset in_progress tasks that haven't moved in STUCK_AFTER_MINUTES."""
    resp, status = api_call("GET", "/tasks?status=in_progress")
    if not resp or status not in (200, 201):
        return
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=STUCK_AFTER_MINUTES)
    for task in resp:
        try:
            updated = datetime.fromisoformat(task["updated_at"]).replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if updated < cutoff:
            task_id = task["id"]
            actor = task.get("agent_type") or task.get("assigned_agent") or "unknown"
            api_call("POST", f"/tasks/{task_id}/comments", {
                "author": "dispatcher",
                "body": f"Task was stuck in_progress for >{STUCK_AFTER_MINUTES} min (claimed by {actor}). Resetting to pending for retry.",
            })
            api_call("PATCH", f"/tasks/{task_id}", {"status": "pending"})


def get_repo_path(task):
    """Resolve the on-disk git repo for a task's project, if any."""
    project_id = task.get("project_id")
    if not project_id:
        return None
    projects, status = api_call("GET", "/projects")
    if not projects or status not in (200, 201):
        return None
    for p in projects:
        if p.get("id") == project_id:
            path = p.get("repo_path")
            if path and os.path.isdir(path):
                return path
    return None


def determine_agent(task):
    if task.get("assigned_agent"):
        return task["assigned_agent"]
    text = f"{task['title']} {task.get('description', '')}".lower()
    if any(k in text for k in ["research", "analyze", "find", "investigate", "look", "study"]):
        return "researcher"
    if any(k in text for k in ["support", "help", "issue", "user", "ticket"]):
        return "support"
    return "dev"


def build_prompt(task, agent_type, repo_path):
    task_id = task["id"]
    title = task["title"]
    desc = task.get("description") or "No description provided."
    project = task.get("project_name") or "Unknown"

    agent_role = {
        "dev": "Full-Stack Developer",
        "researcher": "Research Analyst",
        "support": "Internal Support",
    }.get(agent_type, "Developer")

    # When the project has a real code repo, instruct the agent to actually
    # implement, build, and push — not just analyse.
    if repo_path and agent_type != "researcher":
        work_section = f"""## Working directory
You have been started inside the project's git repository: `{repo_path}`
This is a real codebase. For any task that requires code changes you MUST:

1. Read the relevant files to understand the codebase before editing.
2. Implement the change — write the actual code, do not just describe it.
3. Build / verify it compiles or runs (e.g. `npm run build`, run tests, lint).
4. Commit your work with a clear message:
   `git add -A && git commit -m "<concise description of the change> (task #{task_id})"`
5. Push to the remote so the change is live:
   `git push origin HEAD`
   If you are on the default branch and pushing directly is blocked, create a
   branch first (`git checkout -b task-{task_id}`) and push that.

Do not mark the task done until the code is committed AND pushed. If the build
fails or you cannot push, report exactly what happened in your comment and set
the status to pending."""
    else:
        work_section = """## Instructions
Analyse the task and complete it to the best of your ability using your tools
(read files, run commands, write code, search the web, etc.)."""

    return f"""You are the {agent_type} agent ({agent_role}) working on a task in Force, an AI team management system.

You have a persistent session for the **{project}** project — your conversation history for this project carries over between tasks. Check your prior context for relevant background before starting.

## Task
- ID: {task_id}
- Title: {title}
- Description: {desc}
- Project: {project}

{work_section}

You are running non-interactively — complete the full task in this single session.

## When finished (completed OR blocked), you MUST:

1. POST a summary comment:
   curl -s -X POST {API}/tasks/{task_id}/comments -H "Content-Type: application/json" -d '{{"author": "{agent_type}", "body": "REPLACE_WITH_YOUR_SUMMARY"}}'

2. Update the task status:
   - If done:    curl -s -X PATCH {API}/tasks/{task_id} -H "Content-Type: application/json" -d '{{"status": "done"}}'
   - If blocked: curl -s -X PATCH {API}/tasks/{task_id} -H "Content-Type: application/json" -d '{{"status": "pending"}}'

## Rules
- Do NOT send messages to Telegram, WhatsApp, or any chat platform.
- Do NOT message Pruthvi. All output goes to Force task comments only.
- If the task is unclear or needs human input, post a comment explaining what's needed and set status to pending.

Now begin working on the task.
"""


def dispatch_task(task):
    task_id = task["id"]
    agent_type = determine_agent(task)

    # Claim atomically — 409 means already taken
    _, status = api_call("POST", f"/tasks/{task_id}/claim", {
        "session_id": f"dispatcher-{task_id}",
        "agent_type": agent_type,
    })
    if status not in (200, 201):
        return

    # Post started comment
    api_call("POST", f"/tasks/{task_id}/comments", {
        "author": "dispatcher",
        "body": f"Assigned to @{agent_type}. Starting work now.",
    })

    repo_path = get_repo_path(task)
    prompt = build_prompt(task, agent_type, repo_path)

    # Session key scopes the agent's persistent memory per project.
    # dev:project:42 and dev:project:7 are separate sessions — no context bleed.
    project_id = task.get("project_id")
    session_key = f"{agent_type}:project:{project_id}" if project_id else f"{agent_type}:general"

    # Try the OpenClaw hook API first (persistent dedicated agents)
    hook_payload = json.dumps({
        "message": prompt,
        "name": f"Force task #{task_id}",
        "agentId": agent_type,
        "sessionKey": session_key,
    }).encode()
    hook_req = urllib.request.Request(
        OPENCLAW_HOOK,
        data=hook_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENCLAW_TOKEN}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(hook_req, timeout=10) as r:
            if r.status in (200, 201, 202):
                return  # Successfully handed off to OpenClaw agent
    except Exception:
        pass

    # Fallback: spawn claude directly if hook isn't available
    log_fh = open(DISPATCHER_LOG, "a")
    env = os.environ.copy()
    env["PATH"] = f"/home/pruthvi/.local/bin:{env.get('PATH', '/usr/bin:/bin')}"
    cwd = repo_path or "/home/pruthvi/Projects"
    subprocess.Popen(
        [CLAUDE_BIN, "--dangerously-skip-permissions", "--print", prompt],
        stdout=log_fh,
        stderr=log_fh,
        cwd=cwd,
        env=env,
    )


def main():
    # 1. Reset any stuck tasks first
    reset_stuck_tasks()

    # 2. Pick up pending tasks
    resp, status = api_call("GET", "/tasks?status=pending")
    if not resp or status not in (200, 201):
        sys.exit(0)

    for task in resp[:2]:
        try:
            dispatch_task(task)
        except Exception:
            pass


if __name__ == "__main__":
    main()
