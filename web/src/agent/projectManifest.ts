export type ProjectAppType = "android" | "web" | "hybrid" | "unknown";
export type ProjectExecutionStatus = "planned" | "in_progress" | "blocked" | "verified";

export type ProjectManifest = {
  schemaVersion: 1;
  projectId: string;
  title: string;
  summary: string;
  appType: ProjectAppType;
  targetPlatforms: string[];
  stack: {
    language?: string;
    framework?: string;
    buildSystem?: string;
    minSdk?: number;
    targetSdk?: number;
  };
  capabilities: string[];
  constraints: {
    offlineFirst: boolean;
    localModelAllowed: boolean;
    cloudFallbackAllowed: boolean;
    networkRequired: boolean;
  };
  workspace: {
    root?: string;
    sourceOfTruth?: string;
    entryPoints: string[];
    buildCommands: string[];
    testCommands: string[];
  };
  knowledgePolicy: {
    useProjectSourcesOnly: boolean;
    citeSourceIds: boolean;
    includeConversationHistory: boolean;
  };
  quality: {
    acceptanceCriteria: string[];
    openRisks: string[];
  };
  execution: {
    status: ProjectExecutionStatus;
    currentStage: string;
    nextAction: string;
    updatedAt: string;
  };
};

export function createProjectManifest(project: {
  id: string;
  title: string;
  summary: string;
  updatedAt?: string;
}): ProjectManifest {
  return {
    schemaVersion: 1,
    projectId: project.id,
    title: project.title,
    summary: project.summary,
    appType: "unknown",
    targetPlatforms: [],
    stack: {},
    capabilities: [],
    constraints: {
      offlineFirst: true,
      localModelAllowed: true,
      cloudFallbackAllowed: false,
      networkRequired: false,
    },
    workspace: {
      entryPoints: [],
      buildCommands: [],
      testCommands: [],
    },
    knowledgePolicy: {
      useProjectSourcesOnly: true,
      citeSourceIds: true,
      includeConversationHistory: true,
    },
    quality: {
      acceptanceCriteria: [],
      openRisks: [],
    },
    execution: {
      status: "planned",
      currentStage: "project_profile",
      nextAction: "جمع متطلبات المشروع وتحديد التقنية قبل التخطيط",
      updatedAt: project.updatedAt ?? new Date().toISOString(),
    },
  };
}

export function normalizeProjectManifest(
  project: { id: string; title: string; summary: string; updatedAt: string },
  manifest?: Partial<ProjectManifest>,
): ProjectManifest {
  const defaults = createProjectManifest(project);
  return {
    ...defaults,
    ...manifest,
    projectId: project.id,
    title: project.title,
    summary: project.summary,
    stack: { ...defaults.stack, ...(manifest?.stack ?? {}) },
    constraints: { ...defaults.constraints, ...(manifest?.constraints ?? {}) },
    workspace: { ...defaults.workspace, ...(manifest?.workspace ?? {}) },
    knowledgePolicy: { ...defaults.knowledgePolicy, ...(manifest?.knowledgePolicy ?? {}) },
    quality: { ...defaults.quality, ...(manifest?.quality ?? {}) },
    execution: { ...defaults.execution, ...(manifest?.execution ?? {}) },
  };
}
