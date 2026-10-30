import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readWorkspaceFile, resolveWorkspacePath, type WorkspacePolicy } from "./workspacePolicy";

export type DependencyEdge = {
  from: string;
  to: string;
  specifier: string;
  kind: "relative" | "package";
};

export type DependencyNode = {
  path: string;
  language: string;
  sha256: string;
  bytes: number;
  imports: string[];
  importedBy: string[];
};

export type ProjectDependencyGraph = {
  projectId: string;
  workspaceRoot: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  entryPoints: string[];
  orphanFiles: string[];
  externalImports: Array<{ from: string; specifier: string }>;
};

export type ProjectAnalysisReport = {
  graph: ProjectDependencyGraph;
  summary: {
    files: number;
    edges: number;
    externalImports: number;
    orphanFiles: number;
    connectedFiles: number;
  };
  orphanReasons: Array<{ path: string; reason: string }>;
};

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", ".gradle", ".kaz-snapshots", ".kaz-verification"]);
const MAX_FILES = 300;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".kt", ".kts", ".java", ".py", ".go", ".rs"]);
const RESOLUTION_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".kt", ".kts", ".java", ".py", ".go", ".rs"];

function languageFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const languages: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".kt": "kotlin", ".kts": "kotlin", ".java": "java", ".py": "python", ".go": "go", ".rs": "rust",
  };
  return languages[extension] ?? "other";
}

function extractSpecifiers(content: string, language: string): string[] {
  const specifiers = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !trimmed.startsWith("http://") && !trimmed.startsWith("https://")) specifiers.add(trimmed);
  };

  if (language === "typescript" || language === "javascript") {
    for (const match of content.matchAll(/(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+[\s\S]*?\s+from\s+|require\s*\(\s*)["']([^"']+)["']/g)) add(match[1]);
    for (const match of content.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) add(match[1]);
  } else if (language === "kotlin" || language === "java") {
    for (const match of content.matchAll(/^\s*import\s+([A-Za-z_][\w.]*)/gm)) add(match[1]);
  } else if (language === "python") {
    for (const match of content.matchAll(/^\s*from\s+([.A-Za-z_][\w.]*)\s+import\s+/gm)) add(match[1]);
    for (const match of content.matchAll(/^\s*import\s+([A-Za-z_][\w.]*)/gm)) add(match[1]);
  }
  return [...specifiers];
}

function normalizeCandidate(candidate: string): string {
  return path.posix.normalize(candidate.replaceAll("\\", "/")).replace(/^\.\//, "");
}

function candidatePaths(from: string, specifier: string, language: string): string[] {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const base = normalizeCandidate(path.posix.join(path.posix.dirname(from), specifier));
    return RESOLUTION_EXTENSIONS.flatMap((extension) => [base + extension, `${base}/index${extension}`]);
  }

  if (language === "kotlin" || language === "java") {
    const dotted = specifier.replaceAll(".", "/");
    const candidates: string[] = [];
    for (const root of ["", "src", "src/main/kotlin", "src/main/java", "src/test/kotlin", "src/test/java"]) {
      const prefix = root ? `${root}/` : "";
      candidates.push(`${prefix}${dotted}.kt`, `${prefix}${dotted}.java`);
    }
    return candidates;
  }

  if (language === "python") {
    const dotted = specifier.replace(/^\.+/, "").replaceAll(".", "/");
    return [`${dotted}.py`, `${dotted}/__init__.py`];
  }
  return [];
}

async function collectFiles(policy: WorkspacePolicy): Promise<Array<{ path: string; sha256: string; bytes: number; content: string }>> {
  const files: Array<{ path: string; sha256: string; bytes: number; content: string }> = [];
  let totalBytes = 0;
  async function walk(relativeDirectory: string): Promise<void> {
    if (files.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES) return;
    const absoluteDirectory = relativeDirectory ? resolveWorkspacePath(policy, relativeDirectory, "read").absolutePath : policy.workspaceRoot;
    const entries = await readdir(absoluteDirectory, { withFileTypes: true }) as Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
    for (const entry of entries) {
      if (files.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES) break;
      if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(relativePath);
        continue;
      }
      if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      const absolutePath = resolveWorkspacePath(policy, relativePath, "read").absolutePath;
      const metadata = await stat(absolutePath);
      if (metadata.size > MAX_FILE_BYTES || totalBytes + metadata.size > MAX_TOTAL_BYTES) continue;
      const file = await readWorkspaceFile(policy, relativePath);
      files.push({ path: relativePath.replaceAll("\\", "/"), sha256: file.sha256, bytes: metadata.size, content: file.content });
      totalBytes += metadata.size;
    }
  }
  await walk("");
  return files;
}

export async function analyzeProjectDependencies(policy: WorkspacePolicy, entryPoints: readonly string[] = []): Promise<ProjectAnalysisReport> {
  const files = await collectFiles(policy);
  const fileSet = new Set(files.map((file) => file.path));
  const importsByFile = new Map<string, string[]>();
  const edges: DependencyEdge[] = [];
  const externalImports: Array<{ from: string; specifier: string }> = [];

  for (const file of files) {
    const language = languageFor(file.path);
    const specifiers = extractSpecifiers(file.content, language);
    const resolvedImports: string[] = [];
    for (const specifier of specifiers) {
      const candidates = candidatePaths(file.path, specifier, language);
      const target = candidates.find((candidate) => fileSet.has(candidate));
      if (target) {
        resolvedImports.push(target);
        edges.push({ from: file.path, to: target, specifier, kind: specifier.startsWith(".") ? "relative" : "package" });
      } else if (!specifier.startsWith(".") && (language === "typescript" || language === "javascript" || language === "python")) {
        externalImports.push({ from: file.path, specifier });
      }
    }
    importsByFile.set(file.path, [...new Set(resolvedImports)]);
  }

  const importedBy = new Map<string, string[]>();
  for (const file of files) importedBy.set(file.path, []);
  for (const edge of edges) importedBy.get(edge.to)?.push(edge.from);

  const normalizedEntryPoints = entryPoints.map((entry) => normalizeCandidate(entry)).filter((entry) => fileSet.has(entry));
  const nodes = files.map((file) => ({
    path: file.path,
    language: languageFor(file.path),
    sha256: file.sha256,
    bytes: file.bytes,
    imports: importsByFile.get(file.path) ?? [],
    importedBy: [...new Set(importedBy.get(file.path) ?? [])],
  }));
  const orphanFiles = nodes.filter((node) => node.importedBy.length === 0 && !normalizedEntryPoints.includes(node.path)).map((node) => node.path);
  return {
    graph: {
      projectId: policy.projectId,
      workspaceRoot: policy.workspaceRoot,
      nodes,
      edges,
      entryPoints: normalizedEntryPoints,
      orphanFiles,
      externalImports,
    },
    summary: {
      files: nodes.length,
      edges: edges.length,
      externalImports: externalImports.length,
      orphanFiles: orphanFiles.length,
      connectedFiles: nodes.length - orphanFiles.length,
    },
    orphanReasons: orphanFiles.map((filePath) => ({ path: filePath, reason: "لا توجد علاقة استيراد داخلية تشير إلى الملف، وليس نقطة دخول معلنة." })),
  };
}
