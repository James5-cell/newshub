import process from "node:process"
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
  if (!event.context.user?.id || event.context.user.id !== adminId) {
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

  // ── POST: 新增自訂源 ──
  if (method === "POST") {
    assertAdmin(event)
    const body = await readBody(event)
    if (!body?.name || !body?.subdomain) {
      throw createError({ statusCode: 400, message: "name and subdomain are required" })
    }

    const table = await getCustomSourceTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })

    const id = `buzzing-${body.subdomain}`

    // 檢查是否已存在
    const existing = await table.getById(id)
    if (existing) {
      throw createError({ statusCode: 409, message: `Source "${id}" already exists` })
    }

    await table.create({
      id,
      name: body.name,
      subdomain: body.subdomain,
      type: body.type || "",
      column_id: body.column_id || "world",
      color: body.color || "blue",
      is_active: body.is_active ?? 1,
      interval_ms: body.interval_ms || 600000,
      home_url: body.home_url || `https://${body.subdomain}.buzzing.cc/`,
    })

    return { success: true, id }
  }

  // ── PUT: 更新自訂源 ──
  if (method === "PUT") {
    assertAdmin(event)
    const body = await readBody(event)
    if (!body?.id) {
      throw createError({ statusCode: 400, message: "id is required" })
    }

    const table = await getCustomSourceTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })

    const existing = await table.getById(body.id)
    if (!existing) {
      throw createError({ statusCode: 404, message: `Source "${body.id}" not found` })
    }

    const { id, ...updates } = body
    await table.update(id, updates)

    return { success: true, id }
  }

  // ── DELETE: 刪除自訂源 ──
  if (method === "DELETE") {
    assertAdmin(event)
    const query = getQuery(event)
    const id = query.id as string
    if (!id) {
      throw createError({ statusCode: 400, message: "id query parameter is required" })
    }

    const table = await getCustomSourceTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })

    await table.delete(id)
    return { success: true, id }
  }

  throw createError({ statusCode: 405, message: "Method not allowed" })
})
