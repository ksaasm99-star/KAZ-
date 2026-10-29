import { loadProject, searchProjectMemory } from "../memoryApi";
import type { Project } from "../project";
import type { AgentSearchResult, AgentToolId } from "./agentTask";
import type { ProjectManifest } from "./projectManifest";

export type ReadOnlyAgentTools = {
  read_project_manifest: (projectId: string) => Promise<{ project: Project; manifest: ProjectManifest }>;
  search_project_memory: (projectId: string, query: string) => Promise<AgentSearchResult[]>;
};

export const READ_ONLY_AGENT_TOOLS: readonly AgentToolId[] = ["read_project_manifest", "search_project_memory"];

export function createReadOnlyAgentTools(): ReadOnlyAgentTools {
  return {
    async read_project_manifest(projectId) {
      const project = await loadProject(projectId);
      return { project, manifest: project.manifest };
    },
    async search_project_memory(projectId, query) {
      const result = await searchProjectMemory(query, projectId);
      return result.results;
    },
  };
}
