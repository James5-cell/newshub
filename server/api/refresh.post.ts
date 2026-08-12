import process from "node:process"
import { refreshAllSources, refreshSource } from "#/utils/refresh"
import { getUserRefreshLimitsTable } from "#/database/status"

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Constants
//
//  REGULAR users : 3 requests per 10-minute sliding window
//  ADMIN users   : 50 requests per 10-minute window (for backend debugging)
//
// Changing these values here is the single source of truth – no magic numbers
// anywhere else in this file.
// ─────────────────────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_REGULAR = 3 // max requests per window for regular users
const RATE_LIMIT_ADMIN = 50 // max requests per window for admins

/**
 * Returns true when the current request belongs to the configured admin account.
 * Admin identity is determined by matching event.context.user.id against the
 * ADMIN_GITHUB_ID environment variable (same check used in /api/admin/* routes).
 */
function isAdmin(event: any): boolean {
  const adminId = process.env.ADMIN_GITHUB_ID
  if (!adminId) return false
  return String(event.context.user?.id) === String(adminId)
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !user.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: You must be logged in to manually refresh.",
    })
  }

  const query = getQuery(event)
  const body = await readBody(event).catch(() => ({}))
  const source = (body?.source || query?.source) as string | undefined
  const sources = (body?.sources || query?.sources) as string[] | undefined

  const hasSources = Array.isArray(sources) && sources.length > 0

  if (!source && !hasSources) {
    throw createError({
      statusCode: 400,
      message: "Bad Request: 'source' or non-empty 'sources' array parameter is required.",
    })
  }

  // ── Determine quota based on role ──────────────────────────────────────────
  const admin = isAdmin(event)
  const rateLimit = admin ? RATE_LIMIT_ADMIN : RATE_LIMIT_REGULAR
  const role = admin ? "admin" : "user"

  const limitsTable = await getUserRefreshLimitsTable()
  if (!limitsTable) {
    // Fail-open: if the DB is unavailable, allow the request rather than
    // blocking all users. Log the issue for observability.
    logger.warn("Rate limit table unavailable – allowing request without enforcement")
  }

  const now = Date.now()

  if (limitsTable) {
    const limitInfo = await limitsTable.get(user.id)

    // ── 429 guard ────────────────────────────────────────────────────────────
    if (limitInfo && limitInfo.count >= rateLimit && now < limitInfo.reset_at) {
      const secondsLeft = Math.ceil((limitInfo.reset_at - now) / 1000)
      const minutesLeft = Math.ceil(secondsLeft / 60)
      const displayTime = secondsLeft < 90
        ? `${secondsLeft} second(s)`
        : `${minutesLeft} minute(s)`

      logger.warn(`[RateLimit] ${role} ${user.id} hit limit (${limitInfo.count}/${rateLimit}) – resets in ${displayTime}`)

      throw createError({
        statusCode: 429,
        statusMessage: "Too Many Requests",
        message: `Rate limit exceeded (${rateLimit} refreshes per ${RATE_LIMIT_WINDOW_MS / 60_000} min). Try again in ${displayTime}.`,
        data: {
          resetAt: limitInfo.reset_at,
          count: limitInfo.count,
          limit: rateLimit,
          windowMs: RATE_LIMIT_WINDOW_MS,
          retryAfterMs: limitInfo.reset_at - now,
        },
      })
    }
  }

  // ── Increment counter (pass the shared window duration) ────────────────────
  const newLimit = limitsTable
    ? await limitsTable.increment(user.id, RATE_LIMIT_WINDOW_MS)
    : { count: 1, reset_at: now + RATE_LIMIT_WINDOW_MS }

  /** Shared rateLimit payload attached to every successful response */
  const rateLimitPayload = {
    count: newLimit.count,
    limit: rateLimit,
    resetAt: newLimit.reset_at,
    windowMs: RATE_LIMIT_WINDOW_MS,
  }

  // ── Execute the refresh ────────────────────────────────────────────────────
  try {
    if (source === "all") {
      logger.info(`[Refresh] ${role} ${user.id} triggered ALL-sources refresh (${newLimit.count}/${rateLimit})`)
      const results = await refreshAllSources()
      const succeeded = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      return {
        status: "success",
        message: "Manual refresh of all sources completed.",
        rateLimit: rateLimitPayload,
        summary: { total: results.length, succeeded, failed },
      }
    }

    if (hasSources) {
      logger.info(`[Refresh] ${role} ${user.id} triggered refresh of ${sources!.length} sources (${newLimit.count}/${rateLimit})`)
      const results = await Promise.all(
        sources!.map(async (id) => {
          try {
            await refreshSource(id)
            return { id, success: true }
          } catch (e) {
            return { id, success: false, error: (e as Error).message }
          }
        }),
      )
      const succeeded = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      return {
        status: "success",
        message: "Manual refresh of specified sources completed.",
        rateLimit: rateLimitPayload,
        summary: { total: results.length, succeeded, failed },
      }
    }

    // Single source
    logger.info(`[Refresh] ${role} ${user.id} triggered refresh of "${source}" (${newLimit.count}/${rateLimit})`)
    const result = await refreshSource(source!)

    return {
      status: "success",
      message: `Source "${source}" refreshed successfully.`,
      rateLimit: rateLimitPayload,
      data: {
        id: source,
        updatedTime: result.updatedTime,
        items: result.items,
      },
    }
  } catch (err: any) {
    logger.error(`[Refresh] Failed for source ${source ?? sources}:`, err)
    throw createError({
      statusCode: 500,
      message: err.message || "Failed to refresh source.",
    })
  }
})
