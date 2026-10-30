import { createProjectManifest, normalizeProjectManifest } from "../src/agent/projectManifest";
import type { ProjectManifest } from "../src/agent/projectManifest";
import { MODEL_REGISTRY, MODEL_REGISTRY_VERSION } from "../src/agent/modelRegistry";
import type { ModelRegistryEntry, ModelStatus } from "../src/agent/modelRegistry";
import { DEFAULT_KAZ_IDENTITY, normalizeKazIdentity, type KazIdentity } from "../src/agent/identity";
import type { AgentEvidence, AgentTask } from "../src/agent/agentTask";
import type { CompletionGateResult } from "../src/agent/completionGate";

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): { all(...params: unknown[]): Record<string, unknown>[]; get(...params: unknown[]): Record<string, unknown> | undefined; run(...params: unknown[]): { changes: number } };
  close(): void;
};

type BuiltinProcess = { cwd(): string; getBuiltinModule?: (name: string) => unknown };

declare const process: BuiltinProcess;

const fs = process.getBuiltinModule?.("node:fs") as {
  mkdirSync(path: string, options: { recursive: boolean }): void;
  createReadStream(path: string): { on(event: string, callback: (...args: any[]) => void): void };
  statSync(path: string): { isFile(): boolean; size: number };
};
const path = process.getBuiltinModule?.("node:path") as { resolve(...parts: string[]): string };
const crypto = process.getBuiltinModule?.("node:crypto") as { createHash(algorithm: string): { update(chunk: unknown): { digest(encoding: "hex"): string }; digest(encoding: "hex"): string }; randomUUID?: () => string };
const sqlite = process.getBuiltinModule?.("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };
const databasePath = `${process.cwd()}/.data/kaz-memory.sqlite`;
const modelsDirectory = `${process.cwd()}/.data/models`;
const SECURITY_PROJECT_ID = "__kaz_security__";

function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export type StoredProject = {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  sources: Array<{ id: string; name: string; kind: "file" | "link" | "note"; value: string }>;
  knowledge: Array<{ id: string; title: string; content: string }>;
  messages: Array<{ id: string; role: "user" | "assistant"; text: string }>;
  manifest: ProjectManifest;
};

export type StoredAgentEvidence = AgentEvidence & { taskId: string; projectId: string; recordedAt: string };

export type EvidenceLedgerInput = {
  projectId: string;
  requestId: string;
  approvalId?: string;
  executionId?: string;
  buildId?: string;
  artifactId?: string;
  eventType: string;
  actor: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

export type EvidenceLedgerRecord = EvidenceLedgerInput & {
  eventId: string;
  sequence: number;
  previousHash: string | null;
  eventHash: string;
  occurredAt: string;
};

export type CodeIndexEntry = {
  projectId: string;
  relativePath: string;
  language: string;
  fileSha256: string;
  content: string;
  indexedAt: string;
};

export type CodeSearchResult = CodeIndexEntry & {
  snippet: string;
  rank: number;
};

export type TaskRecoveryStatus = "QUEUED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "FAILED";

export type TaskRecoveryRecord = {
  taskId: string;
  projectId: string;
  idempotencyKey: string;
  status: TaskRecoveryStatus;
  stepIndex: number;
  totalSteps: number;
  result?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export class PersistentMemory {
  private readonly db: SqliteDatabase;

  constructor() {
    fs.mkdirSync(`${process.cwd()}/.data`, { recursive: true });
    fs.mkdirSync(modelsDirectory, { recursive: true });
    this.db = new sqlite.DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        manifest_json TEXT
      );
      CREATE TABLE IF NOT EXISTS project_sources (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('file', 'link', 'note')),
        value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        archived_at TEXT
      );
      CREATE TABLE IF NOT EXISTS project_knowledge (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        archived_at TEXT
      );
      CREATE TABLE IF NOT EXISTS project_messages (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        archived_at TEXT
      );
      CREATE TABLE IF NOT EXISTS memory_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS model_registry (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        execution TEXT NOT NULL CHECK(execution IN ('local', 'cloud')),
        format TEXT NOT NULL,
        status TEXT NOT NULL,
        capabilities_json TEXT NOT NULL,
        family TEXT,
        quantization TEXT,
        context_length INTEGER NOT NULL,
        artifact_json TEXT,
        source_url TEXT,
        license TEXT,
        runtime TEXT NOT NULL,
        requirements_json TEXT NOT NULL,
        policy_json TEXT NOT NULL,
        verification_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      );
      CREATE TABLE IF NOT EXISTS memory_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO memory_metadata (key, value) VALUES ('schema_version', '2');
      INSERT OR IGNORE INTO memory_metadata (key, value) VALUES ('search_index', 'fts5');
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_search USING fts5(
        entity_type UNINDEXED,
        entity_id UNINDEXED,
        project_id UNINDEXED,
        title,
        content,
        created_at UNINDEXED
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS project_code_search USING fts5(
        project_id UNINDEXED,
        relative_path UNINDEXED,
        language UNINDEXED,
        file_sha256 UNINDEXED,
        content,
        indexed_at UNINDEXED
      );
      CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sources_project ON project_sources(project_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_knowledge_project ON project_knowledge(project_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_project ON project_messages(project_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_events_project ON memory_events(project_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS evidence_ledger (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        request_id TEXT NOT NULL,
        approval_id TEXT,
        execution_id TEXT,
        build_id TEXT,
        artifact_id TEXT,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        previous_hash TEXT,
        event_hash TEXT NOT NULL UNIQUE,
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_ledger_project ON evidence_ledger(project_id, sequence ASC);
      CREATE INDEX IF NOT EXISTS idx_evidence_ledger_request ON evidence_ledger(request_id, sequence ASC);
      CREATE TABLE IF NOT EXISTS task_recovery (
        task_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        idempotency_key TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('QUEUED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED')),
        step_index INTEGER NOT NULL DEFAULT 0,
        total_steps INTEGER NOT NULL,
        result_json TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS idx_task_recovery_status ON task_recovery(status, updated_at ASC);
      CREATE TRIGGER IF NOT EXISTS evidence_ledger_no_update
      BEFORE UPDATE ON evidence_ledger
      BEGIN
        SELECT RAISE(ABORT, 'EVIDENCE_LEDGER_APPEND_ONLY');
      END;
      CREATE TRIGGER IF NOT EXISTS evidence_ledger_no_delete
      BEFORE DELETE ON evidence_ledger
      BEGIN
        SELECT RAISE(ABORT, 'EVIDENCE_LEDGER_APPEND_ONLY');
      END;
    `);
    const projectColumns = this.db.prepare("PRAGMA table_info(projects)").all();
    if (!projectColumns.some((column) => String(column.name) === "manifest_json")) {
      this.db.exec("ALTER TABLE projects ADD COLUMN manifest_json TEXT");
    }
    const schemaVersion = this.db.prepare("SELECT value FROM memory_metadata WHERE key = 'schema_version'").get();
    if (Number(schemaVersion?.value ?? 0) < 3) {
      this.db.prepare("UPDATE memory_metadata SET value = '3' WHERE key = 'schema_version'").run();
    }
    const currentSchemaVersion = Number(this.db.prepare("SELECT value FROM memory_metadata WHERE key = 'schema_version'").get()?.value ?? 0);
    if (currentSchemaVersion < 4) {
      this.db.exec("ALTER TABLE task_recovery RENAME TO task_recovery_legacy");
      this.db.exec("CREATE TABLE task_recovery (task_id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, idempotency_key TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('QUEUED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED')), step_index INTEGER NOT NULL DEFAULT 0, total_steps INTEGER NOT NULL, result_json TEXT, error_message TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(project_id, idempotency_key))");
      this.db.exec("INSERT INTO task_recovery (task_id, project_id, idempotency_key, status, step_index, total_steps, result_json, error_message, created_at, updated_at) SELECT task_id, project_id, idempotency_key, status, step_index, total_steps, result_json, error_message, created_at, updated_at FROM task_recovery_legacy");
      this.db.exec("DROP TABLE task_recovery_legacy");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_task_recovery_status ON task_recovery(status, updated_at ASC)");
      this.db.prepare("UPDATE memory_metadata SET value = '4' WHERE key = 'schema_version'").run();
    }
    const migratedSchemaVersion = Number(this.db.prepare("SELECT value FROM memory_metadata WHERE key = 'schema_version'").get()?.value ?? 0);
    if (migratedSchemaVersion < 5) {
      this.db.prepare("UPDATE memory_metadata SET value = '5' WHERE key = 'schema_version'").run();
    }
    const modelCount = this.db.prepare("SELECT COUNT(*) AS count FROM model_registry").get();
    if (Number(modelCount?.count ?? 0) === 0) {
      for (const model of MODEL_REGISTRY) this.saveModel(model);
    }
    const indexed = this.db.prepare("SELECT COUNT(*) AS count FROM memory_search").get();
    if (Number(indexed?.count ?? 0) === 0) {
      const projects = this.db.prepare("SELECT id FROM projects WHERE archived_at IS NULL").all();
      for (const project of projects) this.rebuildSearchIndex(String(project.id));
    }
  }

  listProjects(): StoredProject[] {
    const rows = this.db.prepare("SELECT id, title, summary, updated_at AS updatedAt, manifest_json AS manifestJson FROM projects WHERE archived_at IS NULL AND id != ? ORDER BY updated_at DESC").all(SECURITY_PROJECT_ID);
    return rows.map((row) => this.hydrate(row));
  }

  listArchivedProjects(): StoredProject[] {
    const rows = this.db.prepare("SELECT id, title, summary, updated_at AS updatedAt, manifest_json AS manifestJson FROM projects WHERE archived_at IS NOT NULL AND id != ? ORDER BY updated_at DESC").all(SECURITY_PROJECT_ID);
    return rows.map((row) => this.hydrate(row, true));
  }

  getProject(id: string): StoredProject | null {
    const row = this.db.prepare("SELECT id, title, summary, updated_at AS updatedAt, manifest_json AS manifestJson FROM projects WHERE id = ? AND archived_at IS NULL").get(id);
    return row ? this.hydrate(row) : null;
  }

  getIdentity(): KazIdentity {
    const row = this.db.prepare("SELECT value FROM memory_metadata WHERE key = 'kaz_identity'").get();
    if (!row?.value) return DEFAULT_KAZ_IDENTITY;
    try { return normalizeKazIdentity(JSON.parse(String(row.value)) as Partial<KazIdentity>); } catch { return DEFAULT_KAZ_IDENTITY; }
  }

  saveIdentity(identity: Partial<KazIdentity>): KazIdentity {
    const next = normalizeKazIdentity({ ...this.getIdentity(), ...identity, updatedAt: new Date().toISOString() });
    this.db.prepare("INSERT INTO memory_metadata (key, value) VALUES ('kaz_identity', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(next));
    return next;
  }

  saveProject(project: StoredProject): StoredProject {
    const now = new Date().toISOString();
    const existing = this.db.prepare("SELECT id FROM projects WHERE id = ?").get(project.id);
    const createdAt = existing ? undefined : now;
    this.db.exec("BEGIN");
    try {
      if (existing) {
        this.db.prepare("UPDATE projects SET title = ?, summary = ?, updated_at = ?, archived_at = NULL, manifest_json = ? WHERE id = ?").run(project.title, project.summary, project.updatedAt || now, JSON.stringify(project.manifest), project.id);
        this.db.prepare("UPDATE project_sources SET archived_at = ? WHERE project_id = ? AND archived_at IS NULL").run(now, project.id);
        this.db.prepare("UPDATE project_knowledge SET archived_at = ? WHERE project_id = ? AND archived_at IS NULL").run(now, project.id);
        this.db.prepare("UPDATE project_messages SET archived_at = ? WHERE project_id = ? AND archived_at IS NULL").run(now, project.id);
      } else {
        this.db.prepare("INSERT INTO projects (id, title, summary, created_at, updated_at, manifest_json) VALUES (?, ?, ?, ?, ?, ?)").run(project.id, project.title, project.summary, createdAt, project.updatedAt || now, JSON.stringify(project.manifest));
      }
      const sourceInsert = this.db.prepare("INSERT INTO project_sources (id, project_id, name, kind, value, created_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET project_id = excluded.project_id, name = excluded.name, kind = excluded.kind, value = excluded.value, created_at = excluded.created_at, archived_at = NULL");
      for (const source of project.sources) sourceInsert.run(source.id, project.id, source.name, source.kind, source.value, now);
      const knowledgeInsert = this.db.prepare("INSERT INTO project_knowledge (id, project_id, title, content, created_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET project_id = excluded.project_id, title = excluded.title, content = excluded.content, created_at = excluded.created_at, archived_at = NULL");
      for (const item of project.knowledge) knowledgeInsert.run(item.id, project.id, item.title, item.content, now);
      const messageInsert = this.db.prepare("INSERT INTO project_messages (id, project_id, role, text, created_at, archived_at) VALUES (?, ?, ?, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET project_id = excluded.project_id, role = excluded.role, text = excluded.text, created_at = excluded.created_at, archived_at = NULL");
      for (const message of project.messages) messageInsert.run(message.id, project.id, message.role, message.text, now);
      this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(project.id, "project", project.id, existing ? "updated" : "created", JSON.stringify({ title: project.title, sourceCount: project.sources.length, knowledgeCount: project.knowledge.length, messageCount: project.messages.length }), now);
      this.rebuildSearchIndex(project.id);
      this.db.exec("COMMIT");
      return this.getProject(project.id) ?? project;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  archiveProject(id: string): boolean {
    const now = new Date().toISOString();
    const result = this.db.prepare("UPDATE projects SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL").run(now, now, id);
    if (result.changes > 0) {
      this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, "project", id, "archived", JSON.stringify({}), now);
      this.db.prepare("DELETE FROM memory_search WHERE project_id = ?").run(id);
    }
    return result.changes > 0;
  }

  restoreProject(id: string): boolean {
    const now = new Date().toISOString();
    this.db.exec("BEGIN");
    try {
      const result = this.db.prepare("UPDATE projects SET archived_at = NULL, updated_at = ? WHERE id = ? AND archived_at IS NOT NULL").run(now, id);
      if (result.changes === 0) {
        this.db.exec("ROLLBACK");
        return false;
      }
      this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, "project", id, "restored", JSON.stringify({}), now);
      this.rebuildSearchIndex(id);
      this.db.exec("COMMIT");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  recordFactoryPreparation(projectId: string, requestId: string, engine: string): void {
    const occurredAt = new Date().toISOString();
    const payload = { engine, executionTarget: "android-on-device", apkStatus: "not_started" };
    this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(projectId, "factory_request", requestId, "prepared", JSON.stringify(payload), occurredAt);
    this.appendEvidenceLedgerEvent({ projectId, requestId, eventType: "factory_request_prepared", actor: "kaz.factory", payload, occurredAt });
  }

  recordAuthenticationFailure(input: { traceId: string; method: string; path: string; projectId?: string; reason: "AUTH_REQUIRED" }): void {
    this.ensureSecurityProject();
    const requestedProjectId = input.projectId?.trim();
    const projectExists = requestedProjectId ? this.db.prepare("SELECT id FROM projects WHERE id = ? LIMIT 1").get(requestedProjectId) : undefined;
    const projectId = projectExists ? requestedProjectId! : SECURITY_PROJECT_ID;
    const occurredAt = new Date().toISOString();
    this.appendEvidenceLedgerEvent({
      projectId,
      requestId: `auth:${input.traceId}`,
      eventType: "authentication_failed",
      actor: "kaz.auth",
      payload: { traceId: input.traceId, method: input.method, path: input.path, reason: input.reason },
      occurredAt,
    });
  }

  recordProviderFailure(input: { projectId?: string; requestId: string; provider: string; reason: string }): void {
    this.ensureSecurityProject();
    const requestedProjectId = input.projectId?.trim();
    const projectExists = requestedProjectId ? this.db.prepare("SELECT id FROM projects WHERE id = ? LIMIT 1").get(requestedProjectId) : undefined;
    const projectId = projectExists ? requestedProjectId! : SECURITY_PROJECT_ID;
    this.appendEvidenceLedgerEvent({
      projectId,
      requestId: input.requestId,
      eventType: "llm_provider_failed",
      actor: "kaz.provider-gateway",
      payload: { provider: input.provider, reason: input.reason },
    });
  }

  recordApiError(input: { traceId: string; code: string; status: number; method?: string; path?: string; message?: string }): void {
    this.ensureSecurityProject();
    this.appendEvidenceLedgerEvent({
      projectId: SECURITY_PROJECT_ID,
      requestId: `api-error:${input.traceId}`,
      eventType: "api_error",
      actor: "kaz.error-handler",
      payload: { traceId: input.traceId, code: input.code, status: input.status, method: input.method, path: input.path, message: input.message },
    });
  }

  recordProjectEditEvent(projectId: string, draftId: string, action: "proposed" | "approved" | "rejected" | "applied" | "rolled_back", payload: Record<string, unknown>): void {
    const occurredAt = new Date().toISOString();
    this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(projectId, "project_edit", draftId, action, JSON.stringify(payload), occurredAt);
    this.appendEvidenceLedgerEvent({ projectId, requestId: String(payload.requestId ?? `project-edit:${draftId}`), approvalId: typeof payload.approvalId === "string" ? payload.approvalId : ["approved", "applied"].includes(action) ? `approval:${draftId}` : undefined, executionId: typeof payload.executionId === "string" ? payload.executionId : action === "applied" ? `execution:${draftId}` : undefined, buildId: typeof payload.buildId === "string" ? payload.buildId : undefined, artifactId: typeof payload.artifactId === "string" ? payload.artifactId : undefined, eventType: `project_edit_${action}`, actor: String(payload.actor ?? "kaz.project-edit"), payload, occurredAt });
  }

  recordFactoryVerification(projectId: string, requestId: string, evidence: Record<string, unknown>): void {
    const runId = String(evidence.runId ?? "unknown");
    const entityId = `${requestId}:${runId}`;
    const existing = this.db.prepare("SELECT id FROM memory_events WHERE project_id = ? AND entity_type = 'factory_verification' AND entity_id = ? LIMIT 1").get(projectId, entityId);
    if (existing) return;
    const verified = evidence.compile === "success" && evidence.build === "success";
    this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      projectId,
      "factory_verification",
      entityId,
      verified ? "verified" : "failed",
      JSON.stringify({ requestId, ...evidence }),
      String(evidence.recordedAt ?? new Date().toISOString()),
    );
    this.appendEvidenceLedgerEvent({ projectId, requestId, buildId: runId === "unknown" ? undefined : runId, artifactId: typeof evidence.artifactId === "string" ? evidence.artifactId : undefined, eventType: verified ? "factory_build_verified" : "factory_build_failed", actor: "kaz.factory", payload: evidence, occurredAt: String(evidence.recordedAt ?? new Date().toISOString()) });
  }

  appendEvidenceLedgerEvent(input: EvidenceLedgerInput): EvidenceLedgerRecord {
    if (!input.projectId.trim() || !input.requestId.trim() || !input.eventType.trim() || !input.actor.trim()) throw new Error("INVALID_EVIDENCE_LEDGER_EVENT");
    const previous = this.db.prepare("SELECT event_hash FROM evidence_ledger ORDER BY sequence DESC LIMIT 1").get();
    const previousHash = previous ? String(previous.event_hash) : null;
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const payload = input.payload ?? {};
    const eventId = crypto.randomUUID?.() ?? `ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const canonical = JSON.stringify({ eventId, projectId: input.projectId, requestId: input.requestId, approvalId: input.approvalId ?? null, executionId: input.executionId ?? null, buildId: input.buildId ?? null, artifactId: input.artifactId ?? null, eventType: input.eventType, actor: input.actor, payload, previousHash, occurredAt });
    const eventHash = crypto.createHash("sha256").update(canonical).digest("hex");
    const result = this.db.prepare("INSERT INTO evidence_ledger (event_id, project_id, request_id, approval_id, execution_id, build_id, artifact_id, event_type, actor, payload_json, previous_hash, event_hash, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(eventId, input.projectId, input.requestId, input.approvalId ?? null, input.executionId ?? null, input.buildId ?? null, input.artifactId ?? null, input.eventType, input.actor, JSON.stringify(payload), previousHash, eventHash, occurredAt);
    const row = this.db.prepare("SELECT sequence FROM evidence_ledger WHERE event_id = ?").get(eventId);
    return { ...input, payload, eventId, sequence: Number(row?.sequence ?? result.changes), previousHash, eventHash, occurredAt };
  }

  listEvidenceLedger(projectId: string, requestId?: string): EvidenceLedgerRecord[] {
    const rows = this.db.prepare("SELECT sequence, event_id, project_id, request_id, approval_id, execution_id, build_id, artifact_id, event_type, actor, payload_json, previous_hash, event_hash, occurred_at FROM evidence_ledger WHERE project_id = ? AND (? IS NULL OR request_id = ?) ORDER BY sequence ASC").all(projectId, requestId ?? null, requestId ?? null);
    return rows.flatMap((row) => {
      try {
        return [{ sequence: Number(row.sequence), eventId: String(row.event_id), projectId: String(row.project_id), requestId: String(row.request_id), approvalId: row.approval_id ? String(row.approval_id) : undefined, executionId: row.execution_id ? String(row.execution_id) : undefined, buildId: row.build_id ? String(row.build_id) : undefined, artifactId: row.artifact_id ? String(row.artifact_id) : undefined, eventType: String(row.event_type), actor: String(row.actor), payload: JSON.parse(String(row.payload_json)) as Record<string, unknown>, previousHash: row.previous_hash ? String(row.previous_hash) : null, eventHash: String(row.event_hash), occurredAt: String(row.occurred_at) }];
      } catch {
        return [];
      }
    });
  }

  listRecentEvidenceLedger(limit = 20): EvidenceLedgerRecord[] {
    const rows = this.db.prepare("SELECT sequence, event_id, project_id, request_id, approval_id, execution_id, build_id, artifact_id, event_type, actor, payload_json, previous_hash, event_hash, occurred_at FROM evidence_ledger ORDER BY sequence DESC LIMIT ?").all(Math.max(1, Math.min(100, Math.trunc(limit))));
    return rows.flatMap((row) => {
      try {
        return [{ sequence: Number(row.sequence), eventId: String(row.event_id), projectId: String(row.project_id), requestId: String(row.request_id), approvalId: row.approval_id ? String(row.approval_id) : undefined, executionId: row.execution_id ? String(row.execution_id) : undefined, buildId: row.build_id ? String(row.build_id) : undefined, artifactId: row.artifact_id ? String(row.artifact_id) : undefined, eventType: String(row.event_type), actor: String(row.actor), payload: JSON.parse(String(row.payload_json)) as Record<string, unknown>, previousHash: row.previous_hash ? String(row.previous_hash) : null, eventHash: String(row.event_hash), occurredAt: String(row.occurred_at) }];
      } catch { return []; }
    });
  }

  lastEvidenceEventAt(): string | null {
    const row = this.db.prepare("SELECT occurred_at AS occurredAt FROM evidence_ledger ORDER BY sequence DESC LIMIT 1").get();
    return row?.occurredAt ? String(row.occurredAt) : null;
  }

  createOrGetTask(input: { taskId: string; projectId: string; idempotencyKey: string; totalSteps: number }): { record: TaskRecoveryRecord; created: boolean } {
    if (!input.taskId.trim() || !input.projectId.trim() || !input.idempotencyKey.trim()) throw new Error("TASK_IDEMPOTENCY_INPUT_REQUIRED");
    if (!Number.isInteger(input.totalSteps) || input.totalSteps < 1) throw new Error("TASK_TOTAL_STEPS_INVALID");
    const existing = this.db.prepare("SELECT task_id, project_id, idempotency_key, status, step_index, total_steps, result_json, error_message, created_at, updated_at FROM task_recovery WHERE project_id = ? AND idempotency_key = ? LIMIT 1").get(input.projectId, input.idempotencyKey);
    if (existing) return { record: this.hydrateTaskRecovery(existing), created: false };
    const now = new Date().toISOString();
    this.db.prepare("INSERT INTO task_recovery (task_id, project_id, idempotency_key, status, step_index, total_steps, created_at, updated_at) VALUES (?, ?, ?, 'QUEUED', 0, ?, ?, ?)").run(input.taskId, input.projectId, input.idempotencyKey, input.totalSteps, now, now);
    const row = this.db.prepare("SELECT task_id, project_id, idempotency_key, status, step_index, total_steps, result_json, error_message, created_at, updated_at FROM task_recovery WHERE task_id = ?").get(input.taskId);
    if (!row) throw new Error("TASK_CREATE_FAILED");
    return { record: this.hydrateTaskRecovery(row), created: true };
  }

  updateTaskCheckpoint(input: { taskId: string; status: TaskRecoveryStatus; stepIndex: number; totalSteps: number; result?: Record<string, unknown>; errorMessage?: string }): TaskRecoveryRecord {
    if (!Number.isInteger(input.stepIndex) || input.stepIndex < 0 || input.stepIndex > input.totalSteps) throw new Error("TASK_CHECKPOINT_INVALID");
    const now = new Date().toISOString();
    const result = this.db.prepare("UPDATE task_recovery SET status = ?, step_index = ?, total_steps = ?, result_json = ?, error_message = ?, updated_at = ? WHERE task_id = ?").run(input.status, input.stepIndex, input.totalSteps, input.result ? JSON.stringify(input.result) : null, input.errorMessage ?? null, now, input.taskId);
    if (result.changes === 0) throw new Error("TASK_NOT_FOUND");
    const row = this.db.prepare("SELECT task_id, project_id, idempotency_key, status, step_index, total_steps, result_json, error_message, created_at, updated_at FROM task_recovery WHERE task_id = ?").get(input.taskId);
    if (!row) throw new Error("TASK_NOT_FOUND");
    return this.hydrateTaskRecovery(row);
  }

  listInProgressTasks(): TaskRecoveryRecord[] {
    const rows = this.db.prepare("SELECT task_id, project_id, idempotency_key, status, step_index, total_steps, result_json, error_message, created_at, updated_at FROM task_recovery WHERE status = 'IN_PROGRESS' ORDER BY updated_at ASC").all();
    return rows.map((row) => this.hydrateTaskRecovery(row));
  }

  pauseInProgressTasks(reason: string): TaskRecoveryRecord[] {
    const rows = this.db.prepare("SELECT task_id, project_id, idempotency_key, status, step_index, total_steps, result_json, error_message, created_at, updated_at FROM task_recovery WHERE status = 'IN_PROGRESS' ORDER BY updated_at ASC").all();
    return rows.map((row) => this.updateTaskCheckpoint({ taskId: String(row.task_id), status: "PAUSED", stepIndex: Number(row.step_index), totalSteps: Number(row.total_steps), result: row.result_json ? JSON.parse(String(row.result_json)) as Record<string, unknown> : undefined, errorMessage: reason }));
  }

  private hydrateTaskRecovery(row: Record<string, unknown>): TaskRecoveryRecord {
    let result: Record<string, unknown> | undefined;
    if (typeof row.result_json === "string") {
      try { result = JSON.parse(row.result_json) as Record<string, unknown>; } catch { result = undefined; }
    }
    return {
      taskId: String(row.task_id),
      projectId: String(row.project_id),
      idempotencyKey: String(row.idempotency_key),
      status: String(row.status) as TaskRecoveryStatus,
      stepIndex: Number(row.step_index),
      totalSteps: Number(row.total_steps),
      ...(result ? { result } : {}),
      ...(row.error_message ? { errorMessage: String(row.error_message) } : {}),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  listFactoryVerification(projectId: string, requestId?: string): Array<Record<string, unknown>> {
    const rows = this.db.prepare("SELECT payload_json, action, created_at FROM memory_events WHERE project_id = ? AND entity_type = 'factory_verification' ORDER BY id ASC").all(projectId);
    return rows.flatMap((row) => {
      try {
        const payload = JSON.parse(String(row.payload_json)) as Record<string, unknown>;
        if (requestId && payload.requestId !== requestId) return [];
        return [{ ...payload, action: row.action, recordedAt: String(row.created_at) }];
      } catch {
        return [];
      }
    });
  }

  recordAgentEvidence(task: AgentTask, evidence: AgentEvidence): void {
    this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      task.projectId,
      "agent_evidence",
      `${task.id}:${evidence.step}`,
      evidence.ok ? "verified" : "failed",
      JSON.stringify({ taskId: task.id, ...evidence }),
      evidence.finishedAt,
    );
  }

  recordAgentCompletion(projectId: string, taskId: string, gate: CompletionGateResult): void {
    this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      projectId,
      "agent_task",
      taskId,
      gate.allowed ? "verified" : "blocked",
      JSON.stringify(gate),
      gate.checkedAt,
    );
  }

  listAgentEvidence(projectId: string, taskId?: string): StoredAgentEvidence[] {
    const rows = this.db.prepare("SELECT payload_json, created_at FROM memory_events WHERE project_id = ? AND entity_type = 'agent_evidence' ORDER BY id ASC").all(projectId);
    return rows
      .map((row) => {
        try {
          const payload = JSON.parse(String(row.payload_json)) as AgentEvidence & { taskId: string };
          return { ...payload, projectId, recordedAt: String(row.created_at) };
        } catch {
          return null;
        }
      })
      .filter((item): item is StoredAgentEvidence => Boolean(item && (!taskId || item.taskId === taskId)));
  }

  listModels(): ModelRegistryEntry[] {
    return this.db.prepare("SELECT * FROM model_registry WHERE status != 'deleted' ORDER BY updated_at DESC").all().map((row) => this.hydrateModel(row));
  }

  getModelRecord(id: string): ModelRegistryEntry | null {
    const row = this.db.prepare("SELECT * FROM model_registry WHERE id = ?").get(id);
    return row ? this.hydrateModel(row) : null;
  }

  saveModel(model: ModelRegistryEntry): ModelRegistryEntry {
    if (!/^[A-Za-z0-9._-]+$/.test(model.id)) throw new Error("INVALID_MODEL_ID");
    const now = new Date().toISOString();
    const existing = this.getModelRecord(model.id);
    const createdAt = existing?.createdAt ?? model.createdAt ?? now;
    this.db.prepare(`
      INSERT INTO model_registry (
        id, display_name, execution, format, status, capabilities_json, family, quantization,
        context_length, artifact_json, source_url, license, runtime, requirements_json,
        policy_json, verification_json, created_at, updated_at, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        execution = excluded.execution,
        format = excluded.format,
        status = excluded.status,
        capabilities_json = excluded.capabilities_json,
        family = excluded.family,
        quantization = excluded.quantization,
        context_length = excluded.context_length,
        artifact_json = excluded.artifact_json,
        source_url = excluded.source_url,
        license = excluded.license,
        runtime = excluded.runtime,
        requirements_json = excluded.requirements_json,
        policy_json = excluded.policy_json,
        verification_json = excluded.verification_json,
        updated_at = excluded.updated_at,
        error_message = excluded.error_message
    `).run(
      model.id, model.displayName, model.execution, model.format, model.status,
      JSON.stringify(model.capabilities), model.family ?? null, model.quantization ?? null,
      model.contextLength, model.artifact ? JSON.stringify(model.artifact) : null,
      model.sourceUrl ?? null, model.license ?? null, model.runtime,
      JSON.stringify(model.requirements), JSON.stringify(model.policy),
      JSON.stringify(model.verification), createdAt, model.updatedAt ?? now,
      model.errorMessage ?? null,
    );
    return this.getModelRecord(model.id) ?? model;
  }

  updateModelRecord(id: string, patch: Partial<ModelRegistryEntry>): ModelRegistryEntry | null {
    const current = this.getModelRecord(id);
    if (!current) return null;
    return this.saveModel({ ...current, ...patch, id, updatedAt: new Date().toISOString() });
  }

  getActiveOllamaModel(): string | null {
    const row = this.db.prepare("SELECT value FROM memory_metadata WHERE key = ?").get("ollama.active_model");
    const value = typeof row?.value === "string" ? row.value.trim() : "";
    return value || null;
  }

  setActiveOllamaModel(model: string): void {
    this.db.prepare(`
      INSERT INTO memory_metadata (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run("ollama.active_model", model.trim());
  }

  async verifyModelFile(id: string) {
    const model = this.getModelRecord(id);
    if (!model) return null;
    const artifact = model.artifact;
    const localPath = artifact?.localPath;
    if (!artifact || !localPath) return { id, verified: false, status: model.status, reason: "MODEL_FILE_PATH_REQUIRED" };
    const root = `${path.resolve(modelsDirectory)}/`;
    const filePath = path.resolve(modelsDirectory, localPath);
    if (!filePath.startsWith(root)) throw new Error("MODEL_PATH_OUTSIDE_STORAGE");
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error("MODEL_FILE_REQUIRED");
    const computedSha256 = await sha256File(filePath);
    const expectedSha256 = artifact.sha256?.trim().toLowerCase() ?? "";
    const matches = Boolean(expectedSha256) && expectedSha256 === computedSha256;
    const status: ModelStatus = matches ? "verified" : expectedSha256 ? "corrupted" : "installed";
    const updated = this.updateModelRecord(id, {
      status,
      artifact: { ...artifact, computedSha256, sizeBytes: stat.size },
      verification: { ...model.verification, metadataRead: true, lastVerifiedAt: new Date().toISOString(), evidence: expectedSha256 ? (matches ? "sha256_match" : "sha256_mismatch") : "sha256_computed_expected_value_missing" },
      errorMessage: matches || !expectedSha256 ? undefined : "SHA256_MISMATCH",
    });
    return { id, verified: matches, status, expectedSha256: expectedSha256 || null, computedSha256, sizeBytes: stat.size, model: updated };
  }

  search(query: string, projectId?: string) {
    const normalized = query.trim();
    const projectClause = projectId ? " AND project_id = ?" : "";
    if (!normalized) {
      const rows = this.db.prepare(`SELECT entity_type AS entityType, entity_id AS entityId, project_id AS projectId, title, content, content AS payload, created_at AS createdAt FROM memory_search WHERE 1 = 1${projectClause} ORDER BY created_at DESC LIMIT 100`).all(...(projectId ? [projectId] : []));
      return rows;
    }
    const match = normalized.split(/\s+/).filter(Boolean).map((token) => `"${token.replace(/"/g, '""')}"`).join(" AND ");
    const params = projectId ? [match, projectId] : [match];
    return this.db.prepare(`SELECT entity_type AS entityType, entity_id AS entityId, project_id AS projectId, title, content, content AS payload, created_at AS createdAt FROM memory_search WHERE memory_search MATCH ?${projectClause} ORDER BY rank, created_at DESC LIMIT 100`).all(...params);
  }

  replaceProjectCodeIndex(projectId: string, entries: readonly Omit<CodeIndexEntry, "projectId">[]): void {
    if (!projectId.trim()) throw new Error("CODE_INDEX_PROJECT_REQUIRED");
    this.db.prepare("DELETE FROM project_code_search WHERE project_id = ?").run(projectId);
    const insert = this.db.prepare("INSERT INTO project_code_search (project_id, relative_path, language, file_sha256, content, indexed_at) VALUES (?, ?, ?, ?, ?, ?)");
    for (const entry of entries) {
      insert.run(projectId, entry.relativePath, entry.language, entry.fileSha256, entry.content, entry.indexedAt);
    }
  }

  searchCode(projectId: string, query: string, limit = 20): CodeSearchResult[] {
    if (!projectId.trim()) throw new Error("CODE_INDEX_PROJECT_REQUIRED");
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const normalized = query.trim();
    if (!normalized) return [];
    const match = normalized.split(/\s+/).filter(Boolean).map((token) => `"${token.replace(/"/g, '""')}"`).join(" AND ");
    const rows = this.db.prepare(`SELECT project_id AS projectId, relative_path AS relativePath, language, file_sha256 AS fileSha256, content, indexed_at AS indexedAt, snippet(project_code_search, 4, '[', ']', ' … ', 24) AS snippet, rank FROM project_code_search WHERE project_id = ? AND project_code_search MATCH ? ORDER BY rank LIMIT ?`).all(projectId, match, normalizedLimit);
    return rows.map((row) => ({
      projectId: String(row.projectId),
      relativePath: String(row.relativePath),
      language: String(row.language),
      fileSha256: String(row.fileSha256),
      content: String(row.content),
      indexedAt: String(row.indexedAt),
      snippet: String(row.snippet),
      rank: Number(row.rank),
    }));
  }

  codeIndexCount(projectId: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM project_code_search WHERE project_id = ?").get(projectId);
    return Number(row?.count ?? 0);
  }

  health() {
    const active = this.db.prepare("SELECT COUNT(*) AS count FROM projects WHERE archived_at IS NULL").get();
    const archived = this.db.prepare("SELECT COUNT(*) AS count FROM projects WHERE archived_at IS NOT NULL").get();
    const indexed = this.db.prepare("SELECT COUNT(*) AS count FROM memory_search").get();
    const schema = this.db.prepare("SELECT value FROM memory_metadata WHERE key = 'schema_version'").get();
    const models = this.db.prepare("SELECT COUNT(*) AS count FROM model_registry WHERE status != 'deleted'").get();
    return { storage: "sqlite", schemaVersion: String(schema?.value ?? "unknown"), searchIndex: "fts5", indexedRecords: Number(indexed?.count ?? 0), activeProjects: Number(active?.count ?? 0), archivedProjects: Number(archived?.count ?? 0), modelRegistryVersion: MODEL_REGISTRY_VERSION, modelCount: Number(models?.count ?? 0) };
  }

  private ensureSecurityProject(): void {
    const now = new Date().toISOString();
    const manifest = createProjectManifest({ id: SECURITY_PROJECT_ID, title: "KAZ Security Ledger", summary: "Internal security evidence scope.", updatedAt: now });
    this.db.prepare("INSERT OR IGNORE INTO projects (id, title, summary, created_at, updated_at, archived_at, manifest_json) VALUES (?, ?, ?, ?, ?, ?, ?)").run(SECURITY_PROJECT_ID, "KAZ Security Ledger", "Internal security evidence scope.", now, now, now, JSON.stringify(manifest));
  }

  private rebuildSearchIndex(projectId: string) {
    const project = this.db.prepare("SELECT id, title, summary, updated_at AS updatedAt, manifest_json AS manifestJson FROM projects WHERE id = ? AND archived_at IS NULL").get(projectId);
    this.db.prepare("DELETE FROM memory_search WHERE project_id = ?").run(projectId);
    if (!project) return;
    const insert = this.db.prepare("INSERT INTO memory_search (entity_type, entity_id, project_id, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    insert.run("project", String(project.id), projectId, String(project.title), String(project.summary), String(project.updatedAt));
    const sources = this.db.prepare("SELECT id, name, value, created_at AS createdAt FROM project_sources WHERE project_id = ? AND archived_at IS NULL").all(projectId);
    for (const source of sources) insert.run("source", String(source.id), projectId, String(source.name), String(source.value), String(source.createdAt));
    const knowledge = this.db.prepare("SELECT id, title, content, created_at AS createdAt FROM project_knowledge WHERE project_id = ? AND archived_at IS NULL").all(projectId);
    for (const item of knowledge) insert.run("knowledge", String(item.id), projectId, String(item.title), String(item.content), String(item.createdAt));
    const messages = this.db.prepare("SELECT id, role, text, created_at AS createdAt FROM project_messages WHERE project_id = ? AND archived_at IS NULL").all(projectId);
    for (const message of messages) insert.run("message", String(message.id), projectId, String(message.role), String(message.text), String(message.createdAt));
  }

  private hydrateModel(row: Record<string, unknown>): ModelRegistryEntry {
    const parse = <T>(value: unknown, fallback: T): T => {
      if (typeof value !== "string" || !value.trim()) return fallback;
      try { return JSON.parse(value) as T; } catch { return fallback; }
    };
    return {
      id: String(row.id),
      displayName: String(row.display_name),
      execution: row.execution as ModelRegistryEntry["execution"],
      format: row.format as ModelRegistryEntry["format"],
      status: row.status as ModelStatus,
      capabilities: parse(row.capabilities_json, []),
      family: row.family ? String(row.family) : undefined,
      quantization: row.quantization ? String(row.quantization) : undefined,
      contextLength: Number(row.context_length),
      artifact: parse(row.artifact_json, undefined),
      sourceUrl: row.source_url ? String(row.source_url) : undefined,
      license: row.license ? String(row.license) : undefined,
      runtime: row.runtime as ModelRegistryEntry["runtime"],
      requirements: parse(row.requirements_json, {}),
      policy: parse(row.policy_json, { allowProjectData: false, allowNetwork: false, allowSilentFallback: false }),
      verification: parse(row.verification_json, { metadataRead: false, loaded: false, firstToken: false }),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      errorMessage: row.error_message ? String(row.error_message) : undefined,
    };
  }

  private hydrate(row: Record<string, unknown>, includeArchivedContent = false): StoredProject {
    const id = String(row.id);
    const archivedClause = includeArchivedContent ? "" : " AND archived_at IS NULL";
    const sources = this.db.prepare(`SELECT id, name, kind, value FROM project_sources WHERE project_id = ?${archivedClause} ORDER BY created_at`).all(id).map((item) => ({ id: String(item.id), name: String(item.name), kind: item.kind as "file" | "link" | "note", value: String(item.value) }));
    const knowledge = this.db.prepare(`SELECT id, title, content FROM project_knowledge WHERE project_id = ?${archivedClause} ORDER BY created_at`).all(id).map((item) => ({ id: String(item.id), title: String(item.title), content: String(item.content) }));
    const messages = this.db.prepare(`SELECT id, role, text FROM project_messages WHERE project_id = ?${archivedClause} ORDER BY created_at`).all(id).map((item) => ({ id: String(item.id), role: item.role as "user" | "assistant", text: String(item.text) }));
    const project = { id, title: String(row.title), summary: String(row.summary), updatedAt: String(row.updatedAt) };
    let manifest: Partial<ProjectManifest> | undefined;
    if (typeof row.manifestJson === "string" && row.manifestJson.trim()) {
      try {
        manifest = JSON.parse(row.manifestJson) as Partial<ProjectManifest>;
      } catch {
        manifest = undefined;
      }
    }
    return { ...project, sources, knowledge, messages, manifest: normalizeProjectManifest(project, manifest) };
  }
}
