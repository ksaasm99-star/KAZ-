import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(here, `.sandbox-fixture-${Date.now()}`);
await mkdir(workspaceRoot, { recursive: true });
await writeFile(path.join(workspaceRoot, "visible.txt"), "KAZ-WORKSPACE\n", "utf8");

try {
  const { runInExecutionSandbox } = await import("../server/executionSandbox.ts");
  const result = await runInExecutionSandbox({
    workspaceRoot,
    command: `printf 'WORKSPACE='; pwd; printf 'VISIBLE='; cat visible.txt; if cat /etc/passwd >/dev/null 2>&1; then printf 'SYSTEM_READ=ALLOWED\\n'; else printf 'SYSTEM_READ=DENIED\\n'; fi; if curl --max-time 1 https://google.com >/dev/null 2>&1; then printf 'NETWORK=ALLOWED\\n'; else printf 'NETWORK=DENIED\\n'; fi`,
    limits: { memoryMb: 1024 },
  });
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(result.backend, "bubblewrap-rootless");
  assert.match(result.stdout, /WORKSPACE=\/workspace/);
  assert.match(result.stdout, /VISIBLE=KAZ-WORKSPACE/);
  assert.match(result.stdout, /SYSTEM_READ=DENIED/);
  assert.match(result.stdout, /NETWORK=DENIED/);
  assert.equal(result.filesystemIsolation, true);
  assert.equal(result.networkIsolation, true);
  assert.equal(result.secretsIsolated, true);

  const secretProbe = await runInExecutionSandbox({
    workspaceRoot,
    command: `if [ -n "${"$GEMINI_API_KEY"}" ] || [ -n "${"$GITHUB_TOKEN"}" ]; then printf 'SECRET=LEAKED'; else printf 'SECRET=HIDDEN'; fi`,
  });
  assert.equal(secretProbe.status, "completed", JSON.stringify(secretProbe));
  assert.match(secretProbe.stdout, /SECRET=HIDDEN/);

  const timeoutProbe = await runInExecutionSandbox({
    workspaceRoot,
    command: "sleep 10",
    limits: { timeoutMs: 500, memoryMb: 128, cpuSeconds: 2 },
  });
  assert.equal(timeoutProbe.status, "timed_out", JSON.stringify(timeoutProbe));
  assert.ok(timeoutProbe.durationMs >= 450, `timeout ended too early: ${timeoutProbe.durationMs}ms`);
  assert.ok(timeoutProbe.durationMs < 2_000, `timeout exceeded margin: ${timeoutProbe.durationMs}ms`);

  const previousBinary = process.env.KAZ_BWRAP_BIN;
  process.env.KAZ_BWRAP_BIN = "/definitely-missing-bwrap";
  const blockedProbe = await runInExecutionSandbox({ workspaceRoot, command: "printf SHOULD_NOT_RUN" });
  if (previousBinary === undefined) delete process.env.KAZ_BWRAP_BIN;
  else process.env.KAZ_BWRAP_BIN = previousBinary;
  assert.equal(blockedProbe.status, "blocked", JSON.stringify(blockedProbe));
  assert.match(blockedProbe.reason ?? "", /تعذر تشغيل bwrap/);
  assert.equal(blockedProbe.stdout, "");

  console.log("EXECUTION_SANDBOX=PASS");
  console.log(`BACKEND=${result.backend}`);
  console.log(`SYSTEM_READ=DENIED`);
  console.log(`NETWORK=DENIED`);
  console.log(`SECRETS_ISOLATED=${result.secretsIsolated}`);
  console.log(`TIMEOUT_STATUS=${timeoutProbe.status}`);
  console.log(`TIMEOUT_DURATION_MS=${Math.round(timeoutProbe.durationMs)}`);
  console.log(`MISSING_BWRAP_STATUS=${blockedProbe.status}`);
} finally {
  await rm(workspaceRoot, { recursive: true, force: true });
}
