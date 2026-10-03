import process from "node:process"
import { createError, defineEventHandler, getHeader, getRequestIP, readBody, setHeader } from "h3"
import { subtle } from "uncrypto"
import { MAX_REFRESH_SOURCES, PUBLIC_REFRESH_LIMIT, PUBLIC_REFRESH_WINDOW, REFRESH_BATCH_SIZE } from "@shared/refresh-policy"
import type { RefreshResponse } from "@shared/types"
import { getRefreshControl } from "#/database/refresh-control"
import { getUserRefreshLimitsTable } from "#/database/status"
import { refreshAllSources, refreshSource, refreshSourceBatch } from "#/utils/refresh"

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")
  const body = await readBody(event)
  const input = body?.sources ?? (body?.source ? [body.source] : null)
  if (!Array.isArray(input) || !input.length || input.length > MAX_REFRESH_SOURCES
    || input.some(id => typeof id !== "string" || !id || id.length > 120)) {
    throw createError({ statusCode: 400, message: `请选择 1–${MAX_REFRESH_SOURCES} 个有效来源` })
  }
  const ids = [...new Set(input)] as string[]
  const force = body.force === true || ids.includes("all")
  if (force) {
    const user = event.context.user
    if (!user?.id || !process.env.ADMIN_GITHUB_ID || String(user.id) !== process.env.ADMIN_GITHUB_ID) {
      throw createError({ statusCode: 403, message: "全站或强制更新仅供管理员使用，普通刷新无需登录" })
    }
    if ((process.env.CF_PAGES && ids.includes("all")) || (!ids.includes("all") && ids.length > REFRESH_BATCH_SIZE)) {
      throw createError({ statusCode: 400, message: `请分批更新，每批最多 ${REFRESH_BATCH_SIZE} 个来源` })
    }
    const limits = await getUserRefreshLimitsTable()
    if (!limits) throw createError({ statusCode: 503, message: "限流服务暂时不可用" })
    const previous = await limits.get(user.id)
    if (previous && previous.count >= 50 && Date.now() < previous.reset_at) {
      throw createError({ statusCode: 429, message: "管理员刷新次数已达上限，请稍后重试" })
    }
    const updatedLimit = await limits.increment(user.id)
    if (!updatedLimit) throw createError({ statusCode: 429, message: "管理员刷新次数已达上限，请稍后重试" })
    const results = ids.includes("all")
      ? await refreshAllSources({ force: true })
      : await Promise.all(ids.map(async (id) => {
        try {
          const result = await refreshSource(id, { force: true })
          return { id, success: result.status !== "stale" }
        } catch (error) {
          return { id, success: false, error: error instanceof Error ? error : new Error(String(error)) }
        }
      }))
    return {
      status: "success",
      results,
      rateLimit: { count: updatedLimit.count, limit: 50, resetAt: updatedLimit.reset_at },
    }
  }

  // Only trust Cloudflare's connecting IP when actually deployed to Cloudflare.
  // Forwarded headers from arbitrary clients must not grant fresh quotas.
  const ip = (process.env.CF_PAGES ? getHeader(event, "cf-connecting-ip") : undefined)
    || getRequestIP(event) || "unknown"
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(ip))
  const identity = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
  const control = await getRefreshControl()
  const { allowed, ...rateLimit } = await control.consume(identity, Date.now(), PUBLIC_REFRESH_LIMIT, PUBLIC_REFRESH_WINDOW)
  if (!allowed) {
    setHeader(event, "Retry-After", Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)))
    throw createError({ statusCode: 429, message: "刷新过于频繁，请稍后重试", data: { rateLimit } })
  }
  const result = await refreshSourceBatch(ids)
  return { status: "success", ...result, rateLimit } satisfies RefreshResponse
})
