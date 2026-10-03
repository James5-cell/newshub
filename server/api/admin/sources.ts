import process from "node:process"
import { sources } from "@shared/sources"
import { validateFeedURL } from "#/utils/feed-url"
import { getCustomSourceTable } from "#/database/source-config"

/**
 * Admin CRUD API for custom_sources
 * 所有操作皆校驗 event.context.user.id === ADMIN_GITHUB_ID
 *
 * GET    /api/admin/sources          → 列出所有自訂源（含 inactive）
 * POST   /api/admin/sources          → 新增自訂源
 * PUT    /api/admin/sources          → 更新自訂源
 * DELETE /api/admin/sources?id=xxx   → 刪除自訂源
 */

function assertAdmin(event: any) {
  const adminId = process.env.ADMIN_GITHUB_ID
  if (!adminId) {
    throw createError({ statusCode: 503, message: "ADMIN_GITHUB_ID not configured" })
  }
  if (!event.context.user?.id || String(event.context.user.id) !== String(adminId)) {
    throw createError({ statusCode: 403, message: "Forbidden: Admin access only" })
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method?.toUpperCase() || getMethod(event)

  // ── GET: 列出所有自訂源 ──
  if (method === "GET") {
    assertAdmin(event)
    const table = await getCustomSourceTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })
    return await table.getAll()
  }


  // ── POST / PUT: 新增或更新自訂源 ──
  if (method === "POST" || method === "PUT") {
    assertAdmin(event)
    const body = await readBody(event)
    if (!body || typeof body !== "object" || Array.isArray(body)) throw createError({ statusCode: 400, message: "Invalid source body" })
    if (method === "PUT" && (typeof body.id !== "string" || !body.id)) throw createError({ statusCode: 400, message: "id is required for update" })
    if (body.provider !== undefined && !["rss", "rsshub", "buzzing"].includes(body.provider)) throw createError({ statusCode: 400, message: "Unknown provider" })
    if (body.interval_ms !== undefined && (!Number.isFinite(Number(body.interval_ms)) || Number(body.interval_ms) < 60_000 || Number(body.interval_ms) > 86400_000)) throw createError({ statusCode: 400, message: "interval_ms must be between one minute and one day" })
    for (const key of ["name", "feed_url", "home_url", "badge_label", "subdomain", "id"]) {
      if (body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > (key.endsWith("url") ? 2048 : 120))) throw createError({ statusCode: 400, message: `Invalid ${key}` })
    }
    if (body.subdomain && !/^[a-z0-9-]+$/.test(body.subdomain)) throw createError({ statusCode: 400, message: "Invalid subdomain" })
    if (body.feed_url) {
      try { body.feed_url = validateFeedURL(body.feed_url) } catch { throw createError({ statusCode: 400, message: "Invalid public feed URL" }) }
    }
    const provider = body.provider || "rss"
    const feed_url = body.feed_url || ""
    const subdomain = body.subdomain || ""

    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    const id = body.id || (provider === "buzzing" ? `buzzing-${subdomain}` : `rss-${slugify(body.name || "")}-${Math.random().toString(36).substring(2, 6)}`)
    
    if (method === "POST") {
      if (!body.name) {
        throw createError({ statusCode: 400, message: "name is required" })
      }
      if (provider === "buzzing" && !subdomain) {
        throw createError({ statusCode: 400, message: "subdomain is required for buzzing provider" })
      }
      if (provider !== "buzzing" && !feed_url) {
        throw createError({ statusCode: 400, message: "feed_url is required" })
      }
    }
    if (method === "PUT" && !id) {
      throw createError({ statusCode: 400, message: "id is required for update" })
    }

    if (!/^[\w-]{1,120}$/.test(id) || Object.prototype.hasOwnProperty.call(sources, id)) throw createError({ statusCode: 400, message: "Invalid or reserved source ID" })
    const table = await getCustomSourceTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })

    if (method === "POST") {
      if (await table.getById(id)) throw createError({ statusCode: 400, message: "Source ID already exists" })
      
      const name = body.name
      const type = body.type || ""
      const column_id = body.column_id || "world"
      const color = body.color || "blue"
      const home_url = body.home_url || (provider === "buzzing" ? `https://${subdomain}.buzzing.cc/` : "")
      const is_active = body.is_active !== undefined ? Number(body.is_active) : 1
      const interval_ms = Number(body.interval_ms) || 600000

      const is_mainstream_media = body.is_mainstream_media !== undefined ? Number(body.is_mainstream_media) : 0
      const priority_weight = body.priority_weight !== undefined ? Number(body.priority_weight) : 0
      const badge_label = (body.badge_label ?? "").toString().trim()
      let tags = "[]"
      try {
        if (body.tags) {
          tags = JSON.stringify(typeof body.tags === "string" ? JSON.parse(body.tags) : body.tags)
        }
      } catch { tags = "[]" }

      await table.create({
        id, name, subdomain, provider, feed_url, type, column_id, color, home_url, is_active, interval_ms,
        is_mainstream_media, priority_weight, tags, badge_label
      })
      return { success: true, id }
    }

    if (method === "PUT") {
      if (!await table.getById(id)) throw createError({ statusCode: 404, message: "Source not found" })
      
      const updates: any = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.subdomain !== undefined) updates.subdomain = body.subdomain
      if (body.provider !== undefined) updates.provider = body.provider
      if (body.feed_url !== undefined) updates.feed_url = body.feed_url
      if (body.type !== undefined) updates.type = body.type
      if (body.column_id !== undefined) updates.column_id = body.column_id
      if (body.color !== undefined) updates.color = body.color
      if (body.home_url !== undefined) updates.home_url = body.home_url
      if (body.is_active !== undefined) updates.is_active = Number(body.is_active)
      if (body.interval_ms !== undefined) updates.interval_ms = Number(body.interval_ms)
      
      if (body.is_mainstream_media !== undefined) updates.is_mainstream_media = Number(body.is_mainstream_media)
      if (body.priority_weight !== undefined) updates.priority_weight = Number(body.priority_weight)
      if (body.badge_label !== undefined) updates.badge_label = body.badge_label.toString().trim()
      if (body.tags !== undefined) {
        try {
          updates.tags = JSON.stringify(typeof body.tags === "string" ? JSON.parse(body.tags) : body.tags)
        } catch { updates.tags = "[]" }
      }

      await table.update(id, updates)
      return { success: true, id }
    }
  }

  // ── DELETE: 刪除自訂源 ──
  if (method === "DELETE") {
    assertAdmin(event)
    const body = await readBody<{ id: string }>(event).catch(() => null)
    const id = body?.id || getQuery(event).id as string

    if (!id) {
      throw createError({ statusCode: 400, message: "id is required" })
    }

    const table = await getCustomSourceTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })

    await table.delete(id)
    return { success: true, id }
  }

  throw createError({ statusCode: 405, message: "Method not allowed" })
})
