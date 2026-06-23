#!/usr/bin/env python3
"""Force task dispatcher — runs as system cron, completely silent."""

import json
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta

API = "https://teams.basgod.com/api"
STUCK_AFTER_MINUTES = 30


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


def determine_agent(task):
    if task.get("assigned_agent"):
        return task["assigned_agent"]
    text = f"{task['title']} {task.get('description', '')}".lower()
    if any(k in text for k in ["research", "analyze", "find", "investigate", "look", "study"]):
        return "researcher"
    if any(k in text for k in ["support", "help", "issue", "user", "ticket"]):
        return "support"
    return "dev"


def build_prompt(task, agent_type):
    task_id = task["id"]
    title = task["title"]
    desc = task.get("description") or "No description provided."
    project = task.get("project_name") or "Unknown"

    agent_role = {
        "dev": "Full-Stack Developer",
        "researcher": "Research Analyst",
        "support": "Internal Support",
    }.get(agent_type, "Developer")

    return f"""You are the {agent_type} agent ({agent_role}) working on a task in Force, an AI team management system.

## Task
- ID: {task_id}
- Title: {title}
- Description: {desc}
- Project: {project}

## Instructions
Analyse the task and complete it to the best of your ability using your tools (read files, run commands, write code, search the web, etc.).

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

    # Run claude with --dangerously-skip-permissions so tools work without
    # approval prompts. Prompt is the positional arg; --print = non-interactive.
    prompt = build_prompt(task, agent_type)
    subprocess.Popen(
        ["claude", "--dangerously-skip-permissions", "--print", prompt],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,  # capture stderr so errors are visible in log
        cwd="/home/pruthvi/Projects",
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
