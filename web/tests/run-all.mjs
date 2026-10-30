import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const tests = fs.readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.mjs') && name !== 'run-all.mjs')
  .sort();

let failed = 0;
let blocked = 0;

for (const name of tests) {
  const result = spawnSync(process.execPath, [path.join(testsDir, name)], {
    cwd: path.resolve(testsDir, '..'),
    env: process.env,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.status === 0) {
    continue;
  }

  if (output.includes('REAL_LLM_TEST_BLOCKED')) {
    blocked += 1;
    console.log(`BLOCKED ${name}: يتطلب مزودًا خارجيًا اختياريًا ومفتاحًا صالحًا.`);
    continue;
  }

  failed += 1;
  process.stdout.write(`FAIL ${name}\n${output}\n`);
}

console.log(`TEST_SUMMARY=PASS=${tests.length - failed - blocked};BLOCKED=${blocked};FAIL=${failed}`);
if (failed > 0) {
  process.exitCode = 1;
}
