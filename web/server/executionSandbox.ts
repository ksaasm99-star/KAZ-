import { realpath } from "node:fs/promises";
import { spawn } from "node:child_process";
import { isEmergencyStopped } from "./emergencyStop.ts";

export type SandboxLimits = {
  timeoutMs: number;
  memoryMb: number;
  cpuSeconds: number;
};

export type SandboxResult = {
  status: "completed" | "failed" | "timed_out" | "blocked";
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  workspaceRoot: string;
  filesystemIsolation: true;
  networkIsolation: true;
  secretsIsolated: true;
  limits: SandboxLimits;
  backend: "bubblewrap-rootless";
  reason?: string;
};

const DEFAULT_LIMITS: SandboxLimits = Object.freeze({
  timeoutMs: 15_000,
  memoryMb: 1024,
  cpuSeconds: 10,
});

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function clampLimits(input?: Partial<SandboxLimits>): SandboxLimits {
  const limits = {
    timeoutMs: input?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs,
    memoryMb: input?.memoryMb ?? DEFAULT_LIMITS.memoryMb,
    cpuSeconds: input?.cpuSeconds ?? DEFAULT_LIMITS.cpuSeconds,
  };
  if (!Number.isInteger(limits.timeoutMs) || limits.timeoutMs < 50 || limits.timeoutMs > 120_000) throw new Error("حد timeout غير صالح.");
  if (!Number.isInteger(limits.memoryMb) || limits.memoryMb < 32 || limits.memoryMb > 2048) throw new Error("حد الذاكرة غير صالح.");
  if (!Number.isInteger(limits.cpuSeconds) || limits.cpuSeconds < 1 || limits.cpuSeconds > 120) throw new Error("حد CPU غير صالح.");
  return limits;
}

function monotonicMs(): number {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function spawnBwrapProbe(binary: string): Promise<{ ok: boolean; reason?: string }> {
  return new Promise((resolve) => {
    const probe = spawn(binary, [
      "--die-with-parent",
      "--unshare-user",
      "--unshare-pid",
      "--unshare-net",
      "--unshare-ipc",
      "--unshare-uts",
      "--disable-userns",
      "--clearenv",
      "--ro-bind", "/bin", "/bin",
      "--ro-bind", "/usr", "/usr",
      "--ro-bind", "/lib", "/lib",
      "--ro-bind", "/lib64", "/lib64",
      "--proc", "/proc",
      "--dev", "/dev",
      "--tmpfs", "/tmp",
      "/bin/true",
    ], { env: { PATH: "/usr/bin:/bin" }, stdio: "ignore" });
    probe.once("error", (error: Error) => resolve({ ok: false, reason: `تعذر تشغيل bwrap: ${error.message}` }));
    probe.once("close", (code: number | null, signal: string | null) => resolve(code === 0 ? { ok: true } : { ok: false, reason: `فشل Rootless probe لـbwrap: exit=${code ?? "null"}, signal=${signal ?? "none"}` }));
  });
}

function buildBwrapArgs(workspaceRoot: string, nodePrefix: string, limits: SandboxLimits, command: string): string[] {
  const limitedCommand = [
    "set -eu",
    `ulimit -v ${limits.memoryMb * 1024}`,
    `ulimit -t ${limits.cpuSeconds}`,
    "ulimit -f 65536",
    "ulimit -n 256",
    "cd /workspace",
    `exec /bin/sh -c ${shellQuote(command)}`,
  ].join("\n");
  return [
    "--die-with-parent",
    "--new-session",
    "--unshare-user",
    "--unshare-pid",
    "--unshare-net",
    "--unshare-ipc",
    "--unshare-uts",
    "--disable-userns",
    "--clearenv",
    "--ro-bind", "/bin", "/bin",
    "--ro-bind", "/usr", "/usr",
    "--ro-bind", "/lib", "/lib",
    "--ro-bind", "/lib64", "/lib64",
    "--dir", "/runtime",
    "--ro-bind", nodePrefix, "/runtime/node",
    "--dir", "/workspace",
    "--bind", workspaceRoot, "/workspace",
    "--proc", "/proc",
    "--dev", "/dev",
    "--tmpfs", "/tmp",
    "--setenv", "PATH", "/runtime/node/bin:/usr/bin:/bin",
    "--setenv", "HOME", "/workspace/.kaz-sandbox-home",
    "--setenv", "TMPDIR", "/tmp",
    "--setenv", "LANG", "C",
    "--setenv", "LC_ALL", "C",
    "--setenv", "CI", "1",
    "--setenv", "KAZ_SANDBOX", "1",
    "--",
    "/bin/sh",
    "-c",
    limitedCommand,
  ];
}

export async function runInExecutionSandbox(input: {
  workspaceRoot: string;
  command: string;
  limits?: Partial<SandboxLimits>;
}): Promise<SandboxResult> {
  const requestStartedAt = monotonicMs();
  const limits = clampLimits(input.limits);
  if (!input.command.trim()) throw new Error("أمر التنفيذ مطلوب.");
  const workspaceRoot = await realpath(input.workspaceRoot);
  if (isEmergencyStopped()) {
    return {
      status: "blocked", exitCode: null, signal: null, stdout: "", stderr: "",
      durationMs: monotonicMs() - requestStartedAt, workspaceRoot,
      filesystemIsolation: true, networkIsolation: true, secretsIsolated: true,
      limits, backend: "bubblewrap-rootless", reason: "EMERGENCY_STOPPED",
    };
  }
  const bwrapBinary = process.env.KAZ_BWRAP_BIN ?? "bwrap";
  const probe = await spawnBwrapProbe(bwrapBinary);
  if (!probe.ok) {
    return {
      status: "blocked", exitCode: null, signal: null, stdout: "", stderr: "",
      durationMs: monotonicMs() - requestStartedAt, workspaceRoot,
      filesystemIsolation: true, networkIsolation: true, secretsIsolated: true,
      limits, backend: "bubblewrap-rootless", reason: probe.reason,
    };
  }

  const nodePrefix = process.execPath.split("/bin/")[0];
  const startedAt = monotonicMs();
  const child = spawn(bwrapBinary, buildBwrapArgs(workspaceRoot, nodePrefix, limits, input.command), {
    cwd: workspaceRoot,
    env: { PATH: "/usr/bin:/bin" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let timeoutTimer: any;
  let killTimer: any;
  const terminateGroup = (signal: string) => {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal); } catch { /* process already exited */ }
  };
  const deadline = startedAt + limits.timeoutMs;
  const armTimeout = () => {
    const remaining = Math.max(0, deadline - monotonicMs());
    timeoutTimer = setTimeout(() => {
      timedOut = true;
      terminateGroup("SIGTERM");
      killTimer = setTimeout(() => terminateGroup("SIGKILL"), 100);
    }, remaining);
  };
  child.stdout?.on("data", (chunk: Uint8Array) => { stdout += Buffer.from(chunk).toString("utf8"); });
  child.stderr?.on("data", (chunk: Uint8Array) => { stderr += Buffer.from(chunk).toString("utf8"); });
  armTimeout();

  return await new Promise((resolve) => {
    const finish = (code: number | null, signal: string | null, error?: Error) => {
      clearTimeout(timeoutTimer);
      clearTimeout(killTimer);
      if (error) stderr += error.message;
      const durationMs = monotonicMs() - startedAt;
      resolve({
        status: timedOut ? "timed_out" : code === 0 ? "completed" : "failed",
        exitCode: code,
        signal,
        stdout,
        stderr,
        durationMs,
        workspaceRoot,
        filesystemIsolation: true,
        networkIsolation: true,
        secretsIsolated: true,
        limits,
        backend: "bubblewrap-rootless",
        ...(timedOut ? { reason: "تجاوز التنفيذ deadline monotonic المحدد." } : {}),
      });
    };
    child.once("error", (error: Error) => finish(null, null, error));
    child.once("close", (code: number | null, signal: string | null) => finish(code, signal));
  });
}
