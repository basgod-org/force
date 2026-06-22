# Force ⚡

Agent management dashboard for Pruthvi. See which agents are idle vs working, create and assign tasks, track projects.

## Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind v4, shadcn/ui (base-ui)
- **Backend**: FastAPI, SQLite, uvicorn

## Running locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents with status |
| GET | `/api/projects` | List projects with task counts |
| POST | `/api/projects` | Create a project |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/{id}` | Update task (status, title, etc.) |
| GET | `/health` | Health check |

## Pages

- `/` — Dashboard: agent cards with status/model/role
- `/tasks` — Kanban board: Pending / In Progress / Done + create task modal
- `/projects` — Project list with task counts + create project modal

## Agents (seeded)

| Name | Model | Role |
|------|-------|------|
| Dev | claude-opus-4-8 | Full-Stack Developer |
| Researcher | claude-sonnet-4-6 | Research Analyst |
| Support | claude-haiku-4-5 | Internal Support |
