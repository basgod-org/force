const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "idle" | "working";
  current_task?: string;
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
  },
};
