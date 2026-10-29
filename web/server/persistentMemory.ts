import { createProjectManifest, normalizeProjectManifest } from "../src/agent/projectManifest";
import type { ProjectManifest } from "../src/agent/projectManifest";

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): { all(...params: unknown[]): Record<string, unknown>[]; get(...params: unknown[]): Record<string, unknown> | undefined; run(...params: unknown[]): { changes: number } };
  close(): void;
};

type BuiltinProcess = { cwd(): string; getBuiltinModule?: (name: string) => unknown };

declare const process: BuiltinProcess;

const fs = process.getBuiltinModule?.("node:fs") as { mkdirSync(path: string, options: { recursive: boolean }): void };
const sqlite = process.getBuiltinModule?.("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };
const databasePath = `${process.cwd()}/.data/kaz-memory.sqlite`;

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

export class PersistentMemory {
  private readonly db: SqliteDatabase;

  constructor() {
    fs.mkdirSync(`${process.cwd()}/.data`, { recursive: true });
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
      CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sources_project ON project_sources(project_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_knowledge_project ON project_knowledge(project_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_project ON project_messages(project_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_events_project ON memory_events(project_id, created_at DESC);
    `);
    const projectColumns = this.db.prepare("PRAGMA table_info(projects)").all();
    if (!projectColumns.some((column) => String(column.name) === "manifest_json")) {
      this.db.exec("ALTER TABLE projects ADD COLUMN manifest_json TEXT");
    }
    const indexed = this.db.prepare("SELECT COUNT(*) AS count FROM memory_search").get();
    if (Number(indexed?.count ?? 0) === 0) {
      const projects = this.db.prepare("SELECT id FROM projects WHERE archived_at IS NULL").all();
      for (const project of projects) this.rebuildSearchIndex(String(project.id));
    }
  }

  listProjects(): StoredProject[] {
    const rows = this.db.prepare("SELECT id, title, summary, updated_at AS updatedAt, manifest_json AS manifestJson FROM projects WHERE archived_at IS NULL ORDER BY updated_at DESC").all();
    return rows.map((row) => this.hydrate(row));
  }

  listArchivedProjects(): StoredProject[] {
    const rows = this.db.prepare("SELECT id, title, summary, updated_at AS updatedAt, manifest_json AS manifestJson FROM projects WHERE archived_at IS NOT NULL ORDER BY updated_at DESC").all();
    return rows.map((row) => this.hydrate(row));
  }

  getProject(id: string): StoredProject | null {
    const row = this.db.prepare("SELECT id, title, summary, updated_at AS updatedAt, manifest_json AS manifestJson FROM projects WHERE id = ? AND archived_at IS NULL").get(id);
    return row ? this.hydrate(row) : null;
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
    this.db.prepare("INSERT INTO memory_events (project_id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(projectId, "factory_request", requestId, "prepared", JSON.stringify({ engine, executionTarget: "android-on-device", apkStatus: "not_started" }), new Date().toISOString());
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

  health() {
    const active = this.db.prepare("SELECT COUNT(*) AS count FROM projects WHERE archived_at IS NULL").get();
    const archived = this.db.prepare("SELECT COUNT(*) AS count FROM projects WHERE archived_at IS NOT NULL").get();
    const indexed = this.db.prepare("SELECT COUNT(*) AS count FROM memory_search").get();
    const schema = this.db.prepare("SELECT value FROM memory_metadata WHERE key = 'schema_version'").get();
    return { storage: "sqlite", schemaVersion: String(schema?.value ?? "unknown"), searchIndex: "fts5", indexedRecords: Number(indexed?.count ?? 0), activeProjects: Number(active?.count ?? 0), archivedProjects: Number(archived?.count ?? 0) };
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

  private hydrate(row: Record<string, unknown>): StoredProject {
    const id = String(row.id);
    const sources = this.db.prepare("SELECT id, name, kind, value FROM project_sources WHERE project_id = ? AND archived_at IS NULL ORDER BY created_at").all(id).map((item) => ({ id: String(item.id), name: String(item.name), kind: item.kind as "file" | "link" | "note", value: String(item.value) }));
    const knowledge = this.db.prepare("SELECT id, title, content FROM project_knowledge WHERE project_id = ? AND archived_at IS NULL ORDER BY created_at").all(id).map((item) => ({ id: String(item.id), title: String(item.title), content: String(item.content) }));
    const messages = this.db.prepare("SELECT id, role, text FROM project_messages WHERE project_id = ? AND archived_at IS NULL ORDER BY created_at").all(id).map((item) => ({ id: String(item.id), role: item.role as "user" | "assistant", text: String(item.text) }));
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
