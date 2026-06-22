from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import aiosqlite
from typing import List

from database import init_db, get_db
from models import (
    Agent, Project, ProjectCreate,
    Task, TaskCreate, TaskUpdate,
)

AGENTS: List[Agent] = [
    Agent(id="dev", name="Dev", role="Full-Stack Developer", model="claude-opus-4-8", status="idle"),
    Agent(id="researcher", name="Researcher", role="Research Analyst", model="claude-sonnet-4-6", status="idle"),
    Agent(id="support", name="Support", role="Internal Support", model="claude-haiku-4-5", status="idle"),
]


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
async def list_agents():
    return AGENTS


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
async def list_tasks(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("""
        SELECT t.*, p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON p.id = t.project_id
        ORDER BY t.created_at DESC
    """)
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
        "SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE t.id = ?",
        (cursor.lastrowid,),
    )
    row = await row_cursor.fetchone()
    return Task(**dict(row))


@app.patch("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: int, body: TaskUpdate, db: aiosqlite.Connection = Depends(get_db)):
    check = await (await db.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))).fetchone()
    if not check:
        raise HTTPException(status_code=404, detail="Task not found")

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [task_id]
    await db.execute(
        f"UPDATE tasks SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        values,
    )
    await db.commit()

    row_cursor = await db.execute(
        "SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE t.id = ?",
        (task_id,),
    )
    row = await row_cursor.fetchone()
    return Task(**dict(row))


@app.get("/health")
async def health():
    return {"status": "ok"}
