import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readWorkspaceFile, resolveWorkspacePath, type WorkspacePolicy } from "./workspacePolicy";
import type { CodeSearchResult, PersistentMemory } from "./persistentMemory";

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", ".gradle", ".data", ".kaz-snapshots", ".kaz-verification"]);
const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".txt", ".css", ".html", ".xml", ".yaml", ".yml", ".sql",
  ".kt", ".kts", ".java", ".py", ".go", ".rs", ".sh", ".gradle", ".properties", ".toml", ".env",
]);
const TEXT_FILENAMES = new Set(["Dockerfile", "Makefile", "README", ".env.example"]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_FILES = 1000;

type IndexedFile = {
  relativePath: string;
  language: string;
  fileSha256: string;
  content: string;
  indexedAt: string;
};

export type IndexProjectResult = {
  projectId: string;
  indexedFiles: number;
  skippedBinary: number;
  skippedLarge: number;
  skippedDirectories: number;
  totalBytes: number;
  durationMs: number;
};

function languageFor(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  const languages: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".json": "json", ".md": "markdown", ".txt": "text", ".css": "css", ".html": "html", ".xml": "xml", ".yaml": "yaml", ".yml": "yaml", ".sql": "sql",
    ".kt": "kotlin", ".kts": "kotlin", ".java": "java", ".py": "python", ".go": "go", ".rs": "rust", ".sh": "shell", ".gradle": "gradle", ".properties": "properties", ".toml": "toml", ".env": "dotenv",
  };
  return languages[extension] ?? (TEXT_FILENAMES.has(path.basename(relativePath)) ? "text" : "unknown");
}

function isSupportedTextFile(relativePath: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase()) || TEXT_FILENAMES.has(path.basename(relativePath));
}

export async function indexProject(memory: PersistentMemory, policy: WorkspacePolicy): Promise<IndexProjectResult> {
  const startedAt = performance.now();
  const indexedAt = new Date().toISOString();
  const entries: IndexedFile[] = [];
  let totalBytes = 0;
  let skippedBinary = 0;
  let skippedLarge = 0;
  let skippedDirectories = 0;

  async function walk(relativeDirectory: string): Promise<void> {
    if (entries.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES) return;
    const absoluteDirectory = relativeDirectory ? resolveWorkspacePath(policy, relativeDirectory, "read").absolutePath : policy.workspaceRoot;
    const directoryEntries = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of directoryEntries) {
      if (entries.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES) break;
      if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          skippedDirectories += 1;
          continue;
        }
        await walk(relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      if (!isSupportedTextFile(relativePath)) continue;
      const absolutePath = resolveWorkspacePath(policy, relativePath, "read").absolutePath;
      const metadata = await stat(absolutePath);
      if (metadata.size > MAX_FILE_BYTES || totalBytes + metadata.size > MAX_TOTAL_BYTES) {
        skippedLarge += 1;
        continue;
      }
      const file = await readWorkspaceFile(policy, relativePath);
      if (file.content.includes("\0") || file.content.includes("\ufffd")) {
        skippedBinary += 1;
        continue;
      }
      entries.push({ relativePath: relativePath.replaceAll("\\", "/"), language: languageFor(relativePath), fileSha256: file.sha256, content: file.content, indexedAt });
      totalBytes += metadata.size;
    }
  }

  await walk("");
  memory.replaceProjectCodeIndex(policy.projectId, entries);
  return { projectId: policy.projectId, indexedFiles: entries.length, skippedBinary, skippedLarge, skippedDirectories, totalBytes, durationMs: Math.round(performance.now() - startedAt) };
}

export function searchCode(memory: PersistentMemory, projectId: string, query: string, limit = 20): CodeSearchResult[] {
  return memory.searchCode(projectId, query, limit);
}
