import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

try {
  const [{ listOllamaModels, getActiveOllamaModel, setActiveOllamaModel, pullModel }] = await Promise.all([
    vite.ssrLoadModule("/server/ollamaGateway.ts"),
  ]);
  const memory = {
    getActiveOllamaModel: () => null,
    setActiveOllamaModel: () => {},
  };

  const models = await listOllamaModels();
  assert.equal(models.ok, false);
  assert.equal(models.status, "BLOCKED");
  assert.ok(["OLLAMA_UNAVAILABLE", "OLLAMA_TIMEOUT"].includes(models.reason));

  const active = await getActiveOllamaModel(memory);
  assert.equal(active.ok, false);
  assert.equal(active.status, "BLOCKED");

  const noApproval = await pullModel("qwen2.5-coder:7b");
  assert.equal(noApproval.ok, false);
  assert.equal(noApproval.reason, "OLLAMA_OWNER_APPROVAL_REQUIRED");

  const blockedPull = await pullModel("qwen2.5-coder:7b", { ownerApproved: true });
  assert.equal(blockedPull.ok, false);
  assert.equal(blockedPull.status, "BLOCKED");
  assert.ok(["OLLAMA_UNAVAILABLE", "OLLAMA_TIMEOUT"].includes(blockedPull.reason));

  const unsafeQuantization = await pullModel("qwen2.5-coder:7b-q8_0", { ownerApproved: true });
  assert.equal(unsafeQuantization.ok, false);
  assert.equal(unsafeQuantization.reason, "Q4_K_M_MODEL_TAG_REQUIRED");

  const noModelApproval = await setActiveOllamaModel(memory, "qwen2.5-coder:7b");
  assert.equal(noModelApproval.ok, false);
  assert.equal(noModelApproval.reason, "OLLAMA_OWNER_APPROVAL_REQUIRED");

  console.log(`Ollama Model Selector Runtime: PASS (service=BLOCKED, pull=BLOCKED, q4Policy=PASS)`);
} finally {
  await vite.close();
}
