export type ProjectMessage = { id: string; role: "user" | "assistant"; text: string };

export type ProjectSource = { id: string; name: string; kind: "file" | "link" | "note"; value: string };

export type ProjectKnowledge = { id: string; title: string; content: string };

export type Project = {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  sources: ProjectSource[];
  knowledge: ProjectKnowledge[];
  messages: ProjectMessage[];
};

export type ProjectDraft = { projectName: string; description: string };

export const PROJECTS_KEY = "kaz-web-projects";

export function createProject(draft: ProjectDraft): Project {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now()}`,
    title: draft.projectName.trim(),
    summary: draft.description.trim(),
    updatedAt: now,
    sources: [],
    knowledge: [],
    messages: [{ id: `message-${Date.now()}`, role: "assistant", text: `مرحبًا، هذه محادثة مشروع «${draft.projectName.trim()}» الخاصة. كل ما تضيفه هنا يبقى ضمن هذا المشروع.` }],
  };
}
