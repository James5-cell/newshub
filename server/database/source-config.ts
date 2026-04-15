import process from "node:process"
import type { Database } from "db0"

export interface CustomSource {
  id: string
  name: string
  subdomain: string
  type: string
  column_id: string
  color: string
  is_active: number
  interval_ms: number
  home_url: string
  created_at: number
  updated_at: number
}

export class CustomSourceTable {
  private db
  constructor(db: Database) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS custom_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subdomain TEXT NOT NULL,
        type TEXT DEFAULT '',
        column_id TEXT DEFAULT 'world',
        color TEXT DEFAULT 'blue',
        is_active INTEGER DEFAULT 1,
        interval_ms INTEGER DEFAULT 600000,
        home_url TEXT DEFAULT '',
        created_at INTEGER,
        updated_at INTEGER
      );
    `).run()
    logger.success(`init custom_sources table`)
  }

  async getAll(): Promise<CustomSource[]> {
    const res = await this.db.prepare(
      `SELECT * FROM custom_sources ORDER BY created_at DESC`,
    ).all() as any
    const rows = (res.results ?? res) as CustomSource[]
    return rows ?? []
  }

  async getActive(): Promise<CustomSource[]> {
    const res = await this.db.prepare(
      `SELECT * FROM custom_sources WHERE is_active = 1 ORDER BY created_at DESC`,
    ).all() as any
    const rows = (res.results ?? res) as CustomSource[]
    return rows ?? []
  }

  async getById(id: string): Promise<CustomSource | undefined> {
    return (await this.db.prepare(
      `SELECT * FROM custom_sources WHERE id = ?`,
    ).get(id)) as CustomSource | undefined
  }

  async create(source: Omit<CustomSource, "created_at" | "updated_at">) {
    const now = Date.now()
    await this.db.prepare(
      `INSERT INTO custom_sources (id, name, subdomain, type, column_id, color, is_active, interval_ms, home_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      source.id,
      source.name,
      source.subdomain,
      source.type || "",
      source.column_id || "world",
      source.color || "blue",
      source.is_active ?? 1,
      source.interval_ms || 600000,
      source.home_url || "",
      now,
      now,
    )
    logger.success(`created custom source: ${source.id}`)
  }

  async update(id: string, source: Partial<Omit<CustomSource, "id" | "created_at" | "updated_at">>) {
    const fields: string[] = []
    const values: any[] = []

    if (source.name !== undefined) { fields.push("name = ?"); values.push(source.name) }
    if (source.subdomain !== undefined) { fields.push("subdomain = ?"); values.push(source.subdomain) }
    if (source.type !== undefined) { fields.push("type = ?"); values.push(source.type) }
    if (source.column_id !== undefined) { fields.push("column_id = ?"); values.push(source.column_id) }
    if (source.color !== undefined) { fields.push("color = ?"); values.push(source.color) }
    if (source.is_active !== undefined) { fields.push("is_active = ?"); values.push(source.is_active) }
    if (source.interval_ms !== undefined) { fields.push("interval_ms = ?"); values.push(source.interval_ms) }
    if (source.home_url !== undefined) { fields.push("home_url = ?"); values.push(source.home_url) }

    if (fields.length === 0) return

    fields.push("updated_at = ?")
    values.push(Date.now())
    values.push(id)

    const state = await this.db.prepare(
      `UPDATE custom_sources SET ${fields.join(", ")} WHERE id = ?`,
    ).run(...values)
    if (!state.success) throw new Error(`update custom source ${id} failed`)
    logger.success(`updated custom source: ${id}`)
  }

  async delete(id: string) {
    const state = await this.db.prepare(
      `DELETE FROM custom_sources WHERE id = ?`,
    ).run(id)
    if (!state.success) throw new Error(`delete custom source ${id} failed`)
    logger.success(`deleted custom source: ${id}`)
  }
}

export async function getCustomSourceTable() {
  try {
    const db = useDatabase()
    const table = new CustomSourceTable(db)
    if (process.env.INIT_TABLE !== "false") await table.init()
    return table
  } catch (e) {
    logger.error("failed to init custom_sources table", e)
  }
}
