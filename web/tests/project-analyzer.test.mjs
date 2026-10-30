import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const workspace = await mkdtemp(path.join(os.tmpdir(), "kaz-project-analyzer-"));

try {
  await mkdir(path.join(workspace, "src"), { recursive: true });
  await writeFile(path.join(workspace, "src", "main.ts"), 'import { add } from "./utils";\nimport "./feature";\nconsole.log(add(1, 2));\n', "utf8");
  await writeFile(path.join(workspace, "src", "utils.ts"), "export function add(a: number, b: number) { return a + b; }\n", "utf8");
  await writeFile(path.join(workspace, "src", "feature.ts"), 'import { add } from "./utils";\nexport const ready = add(1, 1);\n', "utf8");
  await writeFile(path.join(workspace, "src", "orphan.ts"), "export const unused = true;\n", "utf8");
  await writeFile(path.join(workspace, "README.md"), "This is documentation and is not a source graph node.\n", "utf8");

  const [{ analyzeProjectDependencies }, { createWorkspacePolicy }] = await Promise.all([
    vite.ssrLoadModule("/server/projectAnalyzer.ts"),
    vite.ssrLoadModule("/server/workspacePolicy.ts"),
  ]);
  const policy = createWorkspacePolicy({ projectId: "project-analyzer-runtime", workspaceRoot: workspace, allowedWritePrefixes: ["src"] });
  const report = await analyzeProjectDependencies(policy, ["src/main.ts"]);

  assert.equal(report.summary.files, 4);
  assert.equal(report.summary.edges, 3);
  assert.deepEqual(report.graph.entryPoints, ["src/main.ts"]);
  assert.ok(report.graph.edges.some((edge) => edge.from === "src/main.ts" && edge.to === "src/utils.ts"));
  assert.ok(report.graph.edges.some((edge) => edge.from === "src/feature.ts" && edge.to === "src/utils.ts"));
  assert.deepEqual(report.graph.orphanFiles, ["src/orphan.ts"]);
  assert.deepEqual(report.graph.nodes.find((node) => node.path === "src/utils.ts")?.importedBy.sort(), ["src/feature.ts", "src/main.ts"]);
  assert.equal(report.summary.externalImports, 0);
  console.log(`Project Analyzer Runtime: PASS (files=${report.summary.files}, edges=${report.summary.edges}, orphan=${report.summary.orphanFiles})`);
} finally {
  await rm(workspace, { recursive: true, force: true });
  await vite.close();
}
