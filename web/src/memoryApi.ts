import { PROJECTS_KEY } from "./project";
import type { Project } from "./project";

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "تعذر الوصول إلى ذاكرة KAZ الدائمة.");
  return body;
}

function readLocal(): Project[] {
  try {
    const stored = window.localStorage.getItem(PROJECTS_KEY);
    return stored ? JSON.parse(stored) as Project[] : [];
  } catch {
    return [];
  }
}

function writeLocal(projects: Project[]) {
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function loadProjects(): Promise<{ projects: Project[]; persistent: boolean }> {
  try {
    const result = await request<{ projects: Project[]; persistent: boolean }>("/api/memory/projects");
    const localProjects = readLocal();
    if (result.projects.length === 0 && localProjects.length > 0) {
      for (const project of localProjects) await saveProject(project);
      return { projects: localProjects, persistent: true };
    }
    return result;
  } catch {
    return { projects: readLocal(), persistent: false };
  }
}

export async function loadProject(id: string): Promise<Project> {
  const result = await request<{ project: Project }>(`/api/memory/projects/${encodeURIComponent(id)}`);
  if (!result.project) throw new Error("المشروع غير موجود.");
  return result.project;
}

export type MemorySearchResult = {
  entityType: string;
  entityId: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
};

export async function searchProjectMemory(query: string, projectId: string): Promise<{ results: MemorySearchResult[]; persistent: boolean }> {
  return request<{ results: MemorySearchResult[]; persistent: boolean }>("/api/memory/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, projectId }),
  });
}

export async function loadArchivedProjects(): Promise<{ projects: Project[]; persistent: boolean }> {
  try {
    return await request<{ projects: Project[]; persistent: boolean }>("/api/memory/projects/archived");
  } catch {
    return { projects: [], persistent: false };
  }
}

export async function restoreArchivedProject(id: string): Promise<{ project: Project; persistent: boolean }> {
  const result = await request<{ restored: boolean; persistent: boolean }>(`/api/memory/projects/${encodeURIComponent(id)}/restore`, { method: "POST" });
  if (!result.restored) throw new Error("تعذر استعادة المشروع المؤرشف.");
  const restored = await request<{ project: Project }>(`/api/memory/projects/${encodeURIComponent(id)}`);
  return { project: restored.project, persistent: result.persistent };
}

export async function saveProject(project: Project): Promise<{ project: Project; persistent: boolean }> {
  try {
    const exists = readLocal().some((item) => item.id === project.id);
    const result = await request<{ project: Project; persistent: boolean }>(exists ? `/api/memory/projects/${encodeURIComponent(project.id)}` : "/api/memory/projects", { method: exists ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
    const localProjects = readLocal().filter((item) => item.id !== project.id);
    writeLocal([result.project, ...localProjects]);
    return result;
  } catch {
    const localProjects = readLocal().filter((item) => item.id !== project.id);
    writeLocal([project, ...localProjects]);
    return { project, persistent: false };
  }
}

export type FactoryBuildStatus = {
  requestId: string;
  projectId: string;
  status: "queued" | "building" | "packaging" | "ready" | "failed";
  apkStatus: "not_started" | "building" | "ready" | "failed";
  message: string;
  directUrl?: string;
  workflowUrl?: string;
};

export async function startFactoryBuild(projectId: string, engine: "auto" | "html_js" | "kotlin" = "kotlin"): Promise<FactoryBuildStatus> {
  return request<FactoryBuildStatus>("/api/factory/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, engine }),
  });
}

export async function getFactoryBuildStatus(requestId: string): Promise<FactoryBuildStatus> {
  return request<FactoryBuildStatus>(`/api/factory/status?requestId=${encodeURIComponent(requestId)}`);
}
