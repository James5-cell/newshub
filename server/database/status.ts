import process from "node:process"
import type { Database } from "db0"
import { initializeTable } from "./init"

export interface SourceStatus {
  id: string
  last_attempt_at: number
  last_success_at: number
  status: "success" | "failed" | "unknown"
  error_message?: string
}

export interface UserRefreshLimit {
  user_id: string
  count: number
  reset_at: number
}

export class SourceStatusTable {
  private db: Database
  constructor(db: Database) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS source_status (
        id TEXT PRIMARY KEY,
        last_attempt_at INTEGER,
        last_success_at INTEGER,
        status TEXT DEFAULT 'unknown',
        error_message TEXT
      );
    `).run()
    logger.success(`init source_status table`)
  }

  async get(id: string): Promise<SourceStatus | undefined> {
    return await this.db.prepare(`SELECT * FROM source_status WHERE id = ?`).get(id) as SourceStatus | undefined
  }

  async getAll(): Promise<SourceStatus[]> {
    const res = await this.db.prepare(`SELECT * FROM source_status`).all() as any
    return (res.results ?? res) as SourceStatus[]
  }

  async getMany(ids: string[]): Promise<SourceStatus[]> {
    const rows: SourceStatus[] = []
    for (let offset = 0; offset < ids.length; offset += 80) {
      const batch = ids.slice(offset, offset + 80)
      const res = await this.db.prepare(`SELECT * FROM source_status WHERE id IN (${batch.map(() => "?").join(",")})`).all(...batch) as any
      rows.push(...(res.results ?? res) as SourceStatus[])
    }
    return rows
  }

  async set(status: SourceStatus) {
    await this.db.prepare(`
      INSERT INTO source_status (id, last_attempt_at, last_success_at, status, error_message)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_attempt_at = excluded.last_attempt_at,
        last_success_at = excluded.last_success_at,
        status = excluded.status,
        error_message = excluded.error_message
    `).run(status.id, status.last_attempt_at, status.last_success_at, status.status, status.error_message ?? null)
    logger.success(`set source_status for ${status.id}: ${status.status}`)
  }
}

export class UserRefreshLimitsTable {
  private db: Database
  constructor(db: Database) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS user_refresh_limits (
        user_id TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0,
        reset_at INTEGER
      );
    `).run()
    logger.success(`init user_refresh_limits table`)
  }

  async get(userId: string): Promise<UserRefreshLimit | undefined> {
    return await this.db.prepare(`SELECT * FROM user_refresh_limits WHERE user_id = ?`).get(userId) as UserRefreshLimit | undefined
  }

  async set(userId: string, count: number, resetAt: number) {
    await this.db.prepare(`
      INSERT INTO user_refresh_limits (user_id, count, reset_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        count = excluded.count,
        reset_at = excluded.reset_at
    `).run(userId, count, resetAt)
  }

  async increment(userId: string, windowMs = 10 * 60 * 1000): Promise<UserRefreshLimit | undefined> {
    const now = Date.now()
    return await this.db.prepare(`
      INSERT INTO user_refresh_limits (user_id, count, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        count = CASE WHEN user_refresh_limits.reset_at <= ? THEN 1 ELSE user_refresh_limits.count + 1 END,
        reset_at = CASE WHEN user_refresh_limits.reset_at <= ? THEN excluded.reset_at ELSE user_refresh_limits.reset_at END
      WHERE user_refresh_limits.reset_at <= ? OR user_refresh_limits.count < 50
      RETURNING user_id, count, reset_at
    `).get(userId, now + windowMs, now, now, now) as UserRefreshLimit | undefined
  }
}

export async function getSourceStatusTable() {
  try {
    const db = useDatabase()
    const table = new SourceStatusTable(db)
    if (process.env.INIT_TABLE !== "false") await initializeTable(db, "source-status", () => table.init())
    return table
  } catch (e) {
    logger.error("failed to init source_status table", e)
  }
}

export async function getUserRefreshLimitsTable() {
  try {
    const db = useDatabase()
    const table = new UserRefreshLimitsTable(db)
    if (process.env.INIT_TABLE !== "false") await initializeTable(db, "user-refresh-limits", () => table.init())
    return table
  } catch (e) {
    logger.error("failed to init user_refresh_limits table", e)
  }
}
