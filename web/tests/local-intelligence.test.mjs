import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const workspace = await mkdtemp(path.join(os.tmpdir(), "kaz-local-intelligence-"));

try {
  await mkdir(path.join(workspace, "src", "components"), { recursive: true });
  await mkdir(path.join(workspace, "src", "app"), { recursive: true });
  await writeFile(path.join(workspace, "src", "main.ts"), 'import "./components/Existing";\n', "utf8");
  await writeFile(path.join(workspace, "src", "utils.ts"), "export const add = (a: number, b: number) => a + b;\n", "utf8");
  await writeFile(path.join(workspace, "src", "components", "Existing.tsx"), 'import { add } from "../utils";\nexport const Existing = () => add(1, 2);\n', "utf8");
  await writeFile(path.join(workspace, "src", "app", "page.tsx"), "export const Page = () => null;\n", "utf8");

  const [{ analyzeProjectDependencies }, { createWorkspacePolicy }, { generateRuleBasedFilePlan, analyzeChangeImpact }] = await Promise.all([
    vite.ssrLoadModule("/server/projectAnalyzer.ts"),
    vite.ssrLoadModule("/server/workspacePolicy.ts"),
    vite.ssrLoadModule("/server/localIntelligence.ts"),
  ]);
  const policy = createWorkspacePolicy({ projectId: "local-intelligence-runtime", workspaceRoot: workspace, allowedWritePrefixes: ["src"] });
  const analysis = await analyzeProjectDependencies(policy, ["src/main.ts"]);
  const plan = generateRuleBasedFilePlan(analysis.graph, "أضف ميزة Auth");
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.strategy, "rule-based");
  assert.match(plan.graphDigest, /^sha256:[a-f0-9]{64}$/);
  assert.ok(plan.entries.some((entry) => entry.path.endsWith("components/auth/AuthForm.tsx")));
  assert.ok(plan.entries.some((entry) => entry.path.endsWith("app/auth/page.tsx")));
  assert.ok(plan.entries.every((entry) => !entry.path.endsWith(".tsx") || entry.path.split("/").includes("components") || entry.path.split("/").includes("app")));
  assert.equal(plan.entries.every((entry) => entry.rule.length > 0), true);

  const impact = analyzeChangeImpact(analysis.graph, "src/utils.ts");
  assert.deepEqual(impact.directDependents, ["src/components/Existing.tsx"]);
  assert.deepEqual(impact.transitiveDependents, ["src/main.ts"]);
  assert.deepEqual(impact.affectedFiles, ["src/components/Existing.tsx", "src/main.ts"]);
  console.log(`Local Intelligence Runtime: PASS (plan=${plan.entries.length}, direct=${impact.directDependents.length}, transitive=${impact.transitiveDependents.length})`);
} finally {
  await rm(workspace, { recursive: true, force: true });
  await vite.close();
}
