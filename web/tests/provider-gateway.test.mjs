import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

class MockProvider {
  constructor(name) { this.name = name; this.calls = []; }
  async generate(prompt) { this.calls.push(prompt); return `mock:${this.name}:${prompt}`; }
  async isAvailable() { return true; }
  async listModels() { return [`${this.name}-model`]; }
  async getModelInfo(modelId) { return { id: modelId, provider: this.name }; }
}

try {
  process.env.KAZ_ENABLE_GEMINI = "false";
  process.env.KAZ_DEFAULT_PROVIDER = "ollama";
  const [{ getProvider, getProviderForModel, listProviders, registerProvider }, { getModelProvider }, { GeminiProvider }, { OllamaProvider }] = await Promise.all([
    vite.ssrLoadModule("/server/providerRegistry.ts"),
    vite.ssrLoadModule("/src/agent/modelRegistry.ts"),
    vite.ssrLoadModule("/server/geminiProvider.ts"),
    vite.ssrLoadModule("/server/ollamaProvider.ts"),
  ]);

  assert.deepEqual(listProviders(), ["ollama"]);
  assert.equal(getProvider("gemini"), null);
  assert.equal(typeof getProvider("ollama")?.generate, "function");
  for (const Provider of [GeminiProvider, OllamaProvider]) {
    const provider = new Provider();
    for (const method of ["generate", "isAvailable", "listModels", "getModelInfo"]) assert.equal(typeof provider[method], "function");
  }

  const mock = new MockProvider("replacement");
  registerProvider("replacement", mock);
  process.env.KAZ_FORCE_PROVIDER = "replacement";
  assert.equal(getModelProvider("kaz-cloud-planner"), "replacement");
  assert.equal(getProviderForModel("kaz-cloud-planner"), mock);
  assert.equal(await mock.generate("gateway-check"), "mock:replacement:gateway-check");
  assert.deepEqual(mock.calls, ["gateway-check"]);

  delete process.env.KAZ_FORCE_PROVIDER;
  assert.equal(getModelProvider("kaz-local-general-small"), "ollama");
  assert.equal(getModelProvider("kaz-cloud-planner"), "ollama");

  const [viteConfig, intelligence, localIntelligence] = await Promise.all([
    readFile("vite.config.ts", "utf8"),
    readFile("server/projectIntelligence.ts", "utf8"),
    readFile("server/localIntelligence.ts", "utf8"),
  ]);
  assert.doesNotMatch(viteConfig, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(intelligence, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(localIntelligence, /\/api\/chat/);
  assert.match(viteConfig, /generateWithConfiguredProvider/);
  assert.match(intelligence, /getProvider\(/);
  assert.match(localIntelligence, /getProviderForModel/);

  console.log("Provider Gateway: PASS (contract=PASS, router=PASS, replacement=PASS, direct-calls=PASS)");
} finally {
  await vite.close();
}
