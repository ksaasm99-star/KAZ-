import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '..');
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), 'utf8');

assert.ok(fs.existsSync(path.join(webRoot, 'install.sh')), 'install.sh must exist');
assert.ok(fs.existsSync(path.join(webRoot, '.env.example')), '.env.example must exist');
assert.ok(fs.existsSync(path.join(webRoot, 'README.md')), 'README.md must exist');
assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'BUILD_FROM_SCRATCH.md')), 'build guide must exist');

const installer = read('install.sh');
const readme = read('README.md');
const envExample = read('.env.example');
const guide = fs.readFileSync(path.join(repoRoot, 'docs', 'BUILD_FROM_SCRATCH.md'), 'utf8');

assert.match(readme, /## البدء السريع/);
assert.match(readme, /git clone https:\/\/github\.com\/ksaasm99-star\/KAZ-\.git/);
assert.match(readme, /## المتطلبات/);
assert.match(readme, /## الاستكشاف وإصلاح الأعطال/);
assert.match(installer, /pnpm install --frozen-lockfile/);
assert.match(installer, /pnpm test/);
assert.match(installer, /command -v ollama/);
assert.match(installer, /randomBytes\(36\)/);
assert.match(installer, /KAZ_OWNER_TOKEN/);
assert.match(installer, /Node\.js/);
assert.match(installer, /pnpm/);
assert.match(envExample, /^KAZ_API_ENABLED=false$/m);
assert.match(envExample, /^# GEMINI_API_KEY=$/m);
assert.match(envExample, /^# OLLAMA_BASE_URL=/m);
assert.match(guide, /rm -rf node_modules \.env \.data/);
assert.match(guide, /لا تنفذ أمر `rm -rf` داخل نسخة KAZ الرسمية/);

console.log('INSTALL_FROM_SCRATCH_TEST=PASS');
