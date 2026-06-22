from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Project(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    repo_path: Optional[str] = None
    created_at: str
    task_count: Optional[int] = 0


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    repo_path: Optional[str] = None


class Task(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    assigned_agent: Optional[str] = None
    status: str  # pending | in_progress | done
    created_at: str
    updated_at: str


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[int] = None
    assigned_agent: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_agent: Optional[str] = None


class Agent(BaseModel):
    id: str
    name: str
    role: str
    model: str
    status: str  # idle | working
    current_task: Optional[str] = None
