import type { Database } from "db0"
import { initializeTable } from "./init"

export class RefreshControl {
  constructor(private db: Database) {}

  async init() {
    await this.db.prepare(`CREATE TABLE IF NOT EXISTS source_refresh_locks (
      id TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL
    )`).run()
    await this.db.prepare(`CREATE TABLE IF NOT EXISTS public_refresh_limits (
      id TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL
    )`).run()
    await this.db.prepare(`CREATE INDEX IF NOT EXISTS public_refresh_expiry
      ON public_refresh_limits (reset_at)`).run()
  }

  async acquire(id: string, token: string, now: number, leaseMs: number): Promise<boolean> {
    const row = await this.db.prepare(`
      INSERT INTO source_refresh_locks (id, token, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at
      WHERE source_refresh_locks.expires_at <= ?
      RETURNING token
    `).get(id, token, now + leaseMs, now) as { token: string } | undefined
    return row?.token === token
  }

  async release(id: string, token: string) {
    await this.db.prepare(`DELETE FROM source_refresh_locks WHERE id = ? AND token = ?`).run(id, token)
  }

  async consume(id: string, now: number, limit: number, windowMs: number) {
    // The expiry index keeps anonymous identities bounded without a table scan.
    await this.db.prepare(`DELETE FROM public_refresh_limits WHERE reset_at <= ?`).run(now)
    const row = await this.db.prepare(`
      INSERT INTO public_refresh_limits (id, count, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET count = public_refresh_limits.count + 1
      WHERE public_refresh_limits.count < ?
      RETURNING count, reset_at
    `).get(id, now + windowMs, limit) as { count: number, reset_at: number } | undefined
    if (row) return { allowed: true, count: row.count, limit, resetAt: row.reset_at }
    const existing = await this.db.prepare(`SELECT count, reset_at FROM public_refresh_limits WHERE id = ?`).get(id) as { count: number, reset_at: number }
    return { allowed: false, count: existing.count, limit, resetAt: existing.reset_at }
  }
}

export async function getRefreshControl() {
  const db = useDatabase()
  const control = new RefreshControl(db)
  // Additive safety tables are required even when legacy INIT_TABLE=false.
  await initializeTable(db, "refresh-control", () => control.init())
  return control
}
