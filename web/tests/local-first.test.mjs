import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const original = {
  api: process.env.KAZ_API_ENABLED,
  defaultProvider: process.env.KAZ_DEFAULT_PROVIDER,
  enableGemini: process.env.KAZ_ENABLE_GEMINI,
  forceProvider: process.env.KAZ_FORCE_PROVIDER,
};

process.env.KAZ_API_ENABLED = 'false';
process.env.KAZ_DEFAULT_PROVIDER = 'ollama';
process.env.KAZ_ENABLE_GEMINI = 'false';
delete process.env.KAZ_FORCE_PROVIDER;

const vite = await createServer({ root: process.cwd(), appType: 'custom', server: { middlewareMode: true, hmr: false } });
try {
  const [{ getDefaultProviderName, getProvider, getProviderForModel, listProviders }, { getModelProvider }] = await Promise.all([
    vite.ssrLoadModule('/server/providerRegistry.ts'),
    vite.ssrLoadModule('/src/agent/modelRegistry.ts'),
  ]);

  assert.equal(getDefaultProviderName(), 'ollama');
  assert.equal(getModelProvider('kaz-local-general-small'), 'ollama');
  assert.equal(getModelProvider('kaz-cloud-planner'), 'ollama');
  assert.equal(typeof getProvider('ollama')?.generate, 'function');
  assert.equal(getProvider('gemini'), null);
  assert.equal(getProviderForModel('kaz-cloud-planner'), getProvider('ollama'));
  assert.deepEqual(listProviders(), ['ollama']);

  process.env.KAZ_DEFAULT_PROVIDER = 'gemini';
  assert.equal(getProvider(), null, 'explicit Gemini selection must fail closed while disabled');

  const envExample = await readFile('.env.example', 'utf8');
  const primary = envExample.split('Optional / Advanced')[0];
  assert.match(primary, /^KAZ_DEFAULT_PROVIDER=ollama$/m);
  assert.match(primary, /^KAZ_OLLAMA_HOST=http:\/\/127\.0\.0\.1:11434$/m);
  assert.doesNotMatch(primary, /GEMINI_API_KEY/);
  assert.match(envExample, /# KAZ_ENABLE_GEMINI=false/);
  assert.match(envExample, /# GEMINI_API_KEY=/);

  const installer = await readFile('install.sh', 'utf8');
  assert.doesNotMatch(installer, /GEMINI_API_KEY/);
  console.log('LOCAL_FIRST_TEST=PASS');
} finally {
  await vite.close();
  for (const [key, value] of Object.entries({ KAZ_API_ENABLED: original.api, KAZ_DEFAULT_PROVIDER: original.defaultProvider, KAZ_ENABLE_GEMINI: original.enableGemini, KAZ_FORCE_PROVIDER: original.forceProvider })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
