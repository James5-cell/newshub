import process from "node:process"
import type { Database } from "db0"

export interface SourceStatus {
  id: string
  last_attempt_at: number
  last_success_at: number
  status: 'success' | 'failed' | 'unknown'
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

  async increment(userId: string): Promise<UserRefreshLimit> {
    const now = Date.now()
    const limit = await this.get(userId)
    if (!limit || now >= limit.reset_at) {
      const count = 1
      const resetAt = now + 60 * 60 * 1000 // 1 hour window
      await this.set(userId, count, resetAt)
      return { user_id: userId, count, reset_at: resetAt }
    } else {
      const count = limit.count + 1
      await this.set(userId, count, limit.reset_at)
      return { user_id: userId, count, reset_at: limit.reset_at }
    }
  }
}

export async function getSourceStatusTable() {
  try {
    const db = useDatabase()
    const table = new SourceStatusTable(db)
    if (process.env.INIT_TABLE !== "false") await table.init()
    return table
  } catch (e) {
    logger.error("failed to init source_status table", e)
  }
}

export async function getUserRefreshLimitsTable() {
  try {
    const db = useDatabase()
    const table = new UserRefreshLimitsTable(db)
    if (process.env.INIT_TABLE !== "false") await table.init()
    return table
  } catch (e) {
    logger.error("failed to init user_refresh_limits table", e)
  }
}
