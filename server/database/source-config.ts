import process from "node:process"
import type { Database } from "db0"

export interface CustomSource {
  id: string
  name: string
  subdomain?: string
  provider: string // 'rss' | 'buzzing' | 'rsshub'
  feed_url: string
  type: string
  column_id: string
  color: string
  is_active: number
  interval_ms: number
  home_url: string
  created_at: number
  updated_at: number
  is_mainstream_media: number
  priority_weight: number
  tags: string // JSON array string
  badge_label: string // optional display label for card badge
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

    // Idempotent migration via safe try-catch column additions
    const safeAddColumn = async (col: string, def: string) => {
      try {
        await this.db.prepare(`ALTER TABLE custom_sources ADD COLUMN ${col} ${def};`).run()
      } catch {
        // Safe to ignore duplicate column error
      }
    }

    await safeAddColumn("is_mainstream_media", "INTEGER DEFAULT 0")
    await safeAddColumn("priority_weight", "INTEGER DEFAULT 0")
    await safeAddColumn("tags", "TEXT DEFAULT '[]'")
    await safeAddColumn("badge_label", "TEXT DEFAULT ''")
    await safeAddColumn("provider", "TEXT DEFAULT 'rss'")
    await safeAddColumn("feed_url", "TEXT DEFAULT ''")

    // Migrate existing Buzzing sources
    try {
      await this.db.prepare(`
        UPDATE custom_sources
        SET provider = 'buzzing',
            feed_url = 'https://' || subdomain || '.buzzing.cc/feed.json'
        WHERE (provider = 'rss' OR provider IS NULL) AND feed_url = '' AND subdomain != '';
      `).run()
    } catch (err) {
      logger.error("Failed to migrate custom_sources feed_url/provider values", err)
    }

    logger.success(`init/migrate custom_sources table`)
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
      `INSERT INTO custom_sources (id, name, subdomain, provider, feed_url, type, column_id, color, is_active, interval_ms, home_url, is_mainstream_media, priority_weight, tags, badge_label, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      source.id,
      source.name,
      source.subdomain || "",
      source.provider || "rss",
      source.feed_url || "",
      source.type || "",
      source.column_id || "world",
      source.color || "blue",
      source.is_active ?? 1,
      source.interval_ms || 600000,
      source.home_url || "",
      source.is_mainstream_media ?? 0,
      source.priority_weight ?? 0,
      source.tags || "[]",
      source.badge_label || "",
      now,
      now,
    )
    logger.success(`created custom source: ${source.id}`)
  }

  async update(id: string, source: Partial<Omit<CustomSource, "id" | "created_at" | "updated_at">>) {
    const fields: string[] = []
    const values: any[] = []

    if (source.name !== undefined) {
      fields.push("name = ?"); values.push(source.name)
    }
    if (source.subdomain !== undefined) {
      fields.push("subdomain = ?"); values.push(source.subdomain)
    }
    if (source.provider !== undefined) {
      fields.push("provider = ?"); values.push(source.provider)
    }
    if (source.feed_url !== undefined) {
      fields.push("feed_url = ?"); values.push(source.feed_url)
    }
    if (source.type !== undefined) {
      fields.push("type = ?"); values.push(source.type)
    }
    if (source.column_id !== undefined) {
      fields.push("column_id = ?"); values.push(source.column_id)
    }
    if (source.color !== undefined) {
      fields.push("color = ?"); values.push(source.color)
    }
    if (source.is_active !== undefined) {
      fields.push("is_active = ?"); values.push(source.is_active)
    }
    if (source.interval_ms !== undefined) {
      fields.push("interval_ms = ?"); values.push(source.interval_ms)
    }
    if (source.home_url !== undefined) {
      fields.push("home_url = ?"); values.push(source.home_url)
    }
    if (source.is_mainstream_media !== undefined) {
      fields.push("is_mainstream_media = ?"); values.push(source.is_mainstream_media)
    }
    if (source.priority_weight !== undefined) {
      fields.push("priority_weight = ?"); values.push(source.priority_weight)
    }
    if (source.tags !== undefined) {
      fields.push("tags = ?"); values.push(source.tags)
    }
    if (source.badge_label !== undefined) {
      fields.push("badge_label = ?"); values.push(source.badge_label)
    }

    if (fields.length === 0) return

    fields.push("updated_at = ?")
    values.push(Date.now())
    values.push(id)

    const state = await this.db.prepare(
      `UPDATE custom_sources SET ${fields.join(", ")} WHERE id = ?`,
    ).run(...values)
    if (state && state.success === false) throw new Error(`update custom source ${id} failed`)
    logger.success(`updated custom source: ${id}`)
  }

  async delete(id: string) {
    const state = await this.db.prepare(
      `DELETE FROM custom_sources WHERE id = ?`,
    ).run(id)
    if (state && state.success === false) throw new Error(`delete custom source ${id} failed`)
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

export interface SourceOverride {
  source_id: string
  is_hidden: number
  created_at: number
  updated_at: number
  is_mainstream_media: number
  priority_weight: number
  tags?: string // JSON array string
  badge_label?: string
  is_deleted?: number
}

export class SourceOverrideTable {
  private db
  constructor(db: Database) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS source_overrides (
        source_id TEXT PRIMARY KEY,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      );
    `).run()

    // Idempotent migration via safe try-catch column additions
    const safeAddColumn = async (col: string, def: string) => {
      try {
        await this.db.prepare(`ALTER TABLE source_overrides ADD COLUMN ${col} ${def};`).run()
      } catch {
        // Safe to ignore duplicate column error
      }
    }

    await safeAddColumn("is_mainstream_media", "INTEGER DEFAULT -1")
    await safeAddColumn("priority_weight", "INTEGER DEFAULT 0")
    await safeAddColumn("tags", "TEXT DEFAULT NULL")
    await safeAddColumn("badge_label", "TEXT DEFAULT NULL")
    await safeAddColumn("is_deleted", "INTEGER DEFAULT 0")

    logger.success(`init/migrate source_overrides table`)
  }

  async getAll(): Promise<SourceOverride[]> {
    const res = await this.db.prepare(
      `SELECT * FROM source_overrides ORDER BY updated_at DESC`,
    ).all() as any
    const rows = (res.results ?? res) as SourceOverride[]
    return rows ?? []
  }

  async getHidden(): Promise<string[]> {
    const res = await this.db.prepare(
      `SELECT source_id FROM source_overrides WHERE is_hidden = 1 OR is_deleted = 1`,
    ).all() as any
    const rows = (res.results ?? res) as { source_id: string }[]
    return rows ? rows.map(r => r.source_id) : []
  }

  async setDeleted(source_id: string, is_deleted: number) {
    const now = Date.now()
    await this.db.prepare(`
      INSERT INTO source_overrides (source_id, is_hidden, is_deleted, created_at, updated_at)
      VALUES (?, 0, ?, ?, ?)
      ON CONFLICT(source_id) DO UPDATE SET
        is_deleted = excluded.is_deleted,
        updated_at = excluded.updated_at
    `).run(source_id, is_deleted, now, now)
    logger.success(`setDeleted source override: ${source_id} (deleted: ${is_deleted})`)
  }

  async setDeletedBulk(source_ids: string[], is_deleted: number) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO source_overrides (source_id, is_hidden, is_deleted, created_at, updated_at)
      VALUES (?, 0, ?, ?, ?)
      ON CONFLICT(source_id) DO UPDATE SET
        is_deleted = excluded.is_deleted,
        updated_at = excluded.updated_at
    `)
    for (const id of source_ids) {
      await stmt.run(id, is_deleted, now, now)
    }
    logger.success(`bulk setDeleted source overrides for ${source_ids.length} items (deleted: ${is_deleted})`)
  }

  async upsert(source_id: string, is_hidden: number, traits?: { is_mainstream_media?: number, priority_weight?: number, tags?: string | null, badge_label?: string | null }) {
    const now = Date.now()

    if (traits) {
      await this.db.prepare(`
        INSERT INTO source_overrides (source_id, is_hidden, is_mainstream_media, priority_weight, tags, badge_label, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
          is_hidden = excluded.is_hidden,
          is_mainstream_media = excluded.is_mainstream_media,
          priority_weight = excluded.priority_weight,
          tags = excluded.tags,
          badge_label = excluded.badge_label,
          updated_at = excluded.updated_at
      `).run(source_id, is_hidden, traits.is_mainstream_media ?? -1, traits.priority_weight ?? 0, traits.tags ?? null, traits.badge_label ?? null, now, now)
    } else {
      await this.db.prepare(`
        INSERT INTO source_overrides (source_id, is_hidden, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
          is_hidden = excluded.is_hidden,
          updated_at = excluded.updated_at
      `).run(source_id, is_hidden, now, now)
    }

    logger.success(`upserted source override: ${source_id} (hidden: ${is_hidden})`)
  }
}

export async function getOverrideTable() {
  try {
    const db = useDatabase()
    const table = new SourceOverrideTable(db)
    if (process.env.INIT_TABLE !== "false") await table.init()
    return table
  } catch (e) {
    logger.error("failed to init source_overrides table", e)
  }
}
