const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "idle" | "working";
  current_task?: string;
  tasks_completed: number;
  tasks_total: number;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  repo_path?: string;
  created_at: string;
  task_count: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  project_id?: number;
  project_name?: string;
  assigned_agent?: string;
  agent_type?: string;
  session_id?: string;
  status: "pending" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  project_id?: number;
  assigned_agent?: string;
}

export interface Comment {
  id: number;
  task_id: number;
  author: string;
  body: string;
  created_at: string;
}

export interface TaskEvent {
  id: number;
  task_id: number;
  from_status?: string;
  to_status: string;
  actor?: string;
  session_id?: string;
  note?: string;
  created_at: string;
}

export interface AgentStats {
  completed: number;
  in_progress: number;
  pending: number;
  recent_tasks: Task[];
}

export interface ProjectCreate {
  name: string;
  description?: string;
  repo_path?: string;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  agents: {
    list: () => req<Agent[]>("/api/agents"),
    stats: (id: string) => req<AgentStats>(`/api/agents/${id}/stats`),
  },
  projects: {
    list: () => req<Project[]>("/api/projects"),
    create: (body: ProjectCreate) =>
      req<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  },
  tasks: {
    list: () => req<Task[]>("/api/tasks"),
    create: (body: TaskCreate) =>
      req<Task>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Task>) =>
      req<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    comments: {
      list: (taskId: number) => req<Comment[]>(`/api/tasks/${taskId}/comments`),
      create: (taskId: number, body: { author: string; body: string }) =>
        req<Comment>(`/api/tasks/${taskId}/comments`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
    events: {
      list: (taskId: number) => req<TaskEvent[]>(`/api/tasks/${taskId}/events`),
    },
  },
};
