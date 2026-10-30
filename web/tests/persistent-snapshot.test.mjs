import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createServer } from "vite";

const root = path.join(process.cwd(), `.kaz-persistent-snapshot-test-${randomUUID()}`);
const project = { id: "persistent-snapshot-project", manifest: { workspace: { root, allowedWritePrefixes: ["src"] } } };
let vite;

try {
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "App.tsx"), "export const value = 1;\n", "utf8");
  vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
  const firstGateway = await vite.ssrLoadModule("/server/projectEditGateway.ts");
  const draft = await firstGateway.proposeProjectEdit({ project, instruction: "إنشاء Snapshot دائم", inputMode: "text", files: [{ path: "src/App.tsx", content: "export const value = 2;\n" }] });
  const applied = await firstGateway.approveProjectEdit(project, draft.approvalToken);
  assert.match(applied.snapshotId ?? "", /^snapshot-[a-f0-9-]+$/);
  const manifestPath = path.join(root, ".kaz-snapshots", applied.snapshotId, "manifest.json");
  assert.match(await readFile(manifestPath, "utf8"), new RegExp(applied.snapshotId));

  await vite.close();
  vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
  const restartedGateway = await vite.ssrLoadModule("/server/projectEditGateway.ts");
  const loaded = await restartedGateway.loadProjectEditSnapshot(project, applied.snapshotId);
  assert.equal(loaded.entries.length, 1);
  assert.equal(await readFile(path.join(loaded.directory, loaded.entries[0].contentFile), "utf8"), "export const value = 1;\n");
  console.log("Persistent Snapshot Runtime: PASS (manifest and file survived gateway restart)");
} finally {
  await vite?.close();
  await rm(root, { recursive: true, force: true });
}
