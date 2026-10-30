import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const workspace = await mkdtemp(path.join(os.tmpdir(), "kaz-semantic-index-"));
const databasePath = path.join(workspace, "memory.sqlite");

try {
  await mkdir(path.join(workspace, "src"), { recursive: true });
  await mkdir(path.join(workspace, "node_modules", "ignored"), { recursive: true });
  await writeFile(path.join(workspace, "src", "auth.ts"), '// تسجيل الدخول للمستخدم\nexport const login = (email: string) => email;\n', "utf8");
  await writeFile(path.join(workspace, "src", "search.ts"), '// semantic code search\nexport const searchCode = (query: string) => query;\n', "utf8");
  await writeFile(path.join(workspace, "src", "binary.bin"), Buffer.from([0, 1, 2, 3]), "binary");
  await writeFile(path.join(workspace, "node_modules", "ignored", "ignored.ts"), "export const ignored = true;\n", "utf8");

  const [{ PersistentMemory }, { createWorkspacePolicy }, { indexProject, searchCode }] = await Promise.all([
    vite.ssrLoadModule("/server/persistentMemory.ts"),
    vite.ssrLoadModule("/server/workspacePolicy.ts"),
    vite.ssrLoadModule("/server/semanticCodeIndex.ts"),
  ]);
  const memory = new PersistentMemory(databasePath);
  const policy = createWorkspacePolicy({ projectId: "semantic-index-runtime", workspaceRoot: workspace, allowedWritePrefixes: ["src"] });
  const indexed = await indexProject(memory, policy);
  assert.equal(indexed.indexedFiles, 2);
  assert.equal(memory.codeIndexCount(policy.projectId), 2);

  const arabicStarted = performance.now();
  const arabic = searchCode(memory, policy.projectId, "تسجيل الدخول");
  const arabicMs = performance.now() - arabicStarted;
  assert.equal(arabic.length, 1);
  assert.equal(arabic[0].relativePath, "src/auth.ts");
  assert.match(arabic[0].snippet, /تسجيل|الدخول/);

  const englishStarted = performance.now();
  const english = searchCode(memory, policy.projectId, "semantic search");
  const englishMs = performance.now() - englishStarted;
  assert.equal(english.length, 1);
  assert.equal(english[0].relativePath, "src/search.ts");
  assert.match(english[0].snippet, /semantic|search/);
  assert.ok(arabicMs < 1000 && englishMs < 1000);
  assert.equal(searchCode(memory, policy.projectId, "not-present-term").length, 0);
  console.log(`Semantic Code Index Runtime: PASS (indexed=${indexed.indexedFiles}, arabic=${arabic.length}, english=${english.length}, arabicMs=${arabicMs.toFixed(2)}, englishMs=${englishMs.toFixed(2)})`);
} finally {
  await rm(workspace, { recursive: true, force: true });
  await vite.close();
}
