import process from "node:process"
import { getOverrideTable } from "#/database/source-config"

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

  // ── GET: 列出所有 override 記錄 ──
  if (method === "GET") {
    assertAdmin(event)
    const table = await getOverrideTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })
    return await table.getAll()
  }

  // ── PUT: 更新靜態源狀態與特徵覆寫 ──
  if (method === "PUT") {
    assertAdmin(event)
    const body = await readBody(event).catch(() => null)
    
    const table = await getOverrideTable()
    if (!table) throw createError({ statusCode: 500, message: "Database unavailable" })

    // Bulk override action
    if (body && body.action === "bulk" && Array.isArray(body.ids)) {
      if (typeof body.is_hidden === 'number') {
        for (const id of body.ids) {
          await table.upsert(id, body.is_hidden)
        }
        return { success: true, count: body.ids.length, is_hidden: body.is_hidden }
      }
      if (typeof body.is_deleted === 'number') {
        await table.setDeletedBulk(body.ids, body.is_deleted)
        return { success: true, count: body.ids.length, is_deleted: body.is_deleted }
      }
    }

    if (!body || !body.id) {
      throw createError({ statusCode: 400, message: "id is required in body" })
    }

    if (body.is_deleted !== undefined) {
      await table.setDeleted(body.id, Number(body.is_deleted))
      return { success: true, id: body.id, is_deleted: body.is_deleted }
    }

    if (typeof body.is_hidden !== 'number') {
      throw createError({ statusCode: 400, message: "id and is_hidden are required in body" })
    }

    // Parse traits safely
    let tags: string | undefined
    if (body.tags !== undefined) {
      try {
        tags = JSON.stringify(typeof body.tags === "string" ? JSON.parse(body.tags) : body.tags)
      } catch { tags = "[]" }
    }

    const traits = {
      is_mainstream_media: body.is_mainstream_media !== undefined ? Number(body.is_mainstream_media) : undefined,
      priority_weight: body.priority_weight !== undefined ? Number(body.priority_weight) : undefined,
      tags,
      badge_label: body.badge_label !== undefined ? (body.badge_label ?? "").toString().trim() : undefined,
    }

    await table.upsert(body.id, body.is_hidden, traits)
    return { success: true, id: body.id, is_hidden: body.is_hidden, traits }
  }

  throw createError({ statusCode: 405, message: "Method not allowed" })
})
