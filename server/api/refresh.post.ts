import { refreshSource, refreshAllSources } from "#/utils/refresh"
import { getUserRefreshLimitsTable } from "#/database/status"

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !user.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: You must be logged in to manually refresh."
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
      message: "Bad Request: 'source' or non-empty 'sources' array parameter is required."
    })
  }

  const limitsTable = await getUserRefreshLimitsTable()
  if (!limitsTable) {
    throw createError({
      statusCode: 500,
      message: "Database Error: Cannot retrieve refresh limits table."
    })
  }

  const now = Date.now()
  const limitInfo = await limitsTable.get(user.id)
  
  if (limitInfo && limitInfo.count >= 3 && now < limitInfo.reset_at) {
    const minutesLeft = Math.ceil((limitInfo.reset_at - now) / (60 * 1000))
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      message: `Too Many Requests: Rate limit exceeded. Try again in ${minutesLeft} minute(s).`,
      data: {
        resetAt: limitInfo.reset_at,
        count: limitInfo.count,
        limit: 3
      }
    })
  }

  // Increment the counter
  const newLimit = await limitsTable.increment(user.id)

  try {
    if (source === "all") {
      logger.info(`User ${user.id} triggered manual refresh of ALL sources (refresh count: ${newLimit.count}/3)`)
      const results = await refreshAllSources()
      const succeeded = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      return {
        status: "success",
        message: "Manual refresh of all sources completed.",
        rateLimit: {
          count: newLimit.count,
          limit: 3,
          resetAt: newLimit.reset_at
        },
        summary: {
          total: results.length,
          succeeded,
          failed
        }
      }
    } else if (hasSources) {
      logger.info(`User ${user.id} triggered manual refresh of ${sources.length} sources (refresh count: ${newLimit.count}/3)`)
      const results = await Promise.all(
        sources.map(async (id) => {
          try {
            await refreshSource(id)
            return { id, success: true }
          } catch (e) {
            return { id, success: false, error: e }
          }
        })
      )
      const succeeded = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      return {
        status: "success",
        message: "Manual refresh of specified sources completed.",
        rateLimit: {
          count: newLimit.count,
          limit: 3,
          resetAt: newLimit.reset_at
        },
        summary: {
          total: results.length,
          succeeded,
          failed
        }
      }
    } else {
      logger.info(`User ${user.id} triggered manual refresh of source ${source} (refresh count: ${newLimit.count}/3)`)
      const result = await refreshSource(source!)
      
      return {
        status: "success",
        message: `Source ${source} refreshed successfully.`,
        rateLimit: {
          count: newLimit.count,
          limit: 3,
          resetAt: newLimit.reset_at
        },
        data: {
          id: source,
          updatedTime: result.updatedTime,
          items: result.items
        }
      }
    }
  } catch (err: any) {
    logger.error(`Manual refresh failed for source ${source || sources}:`, err)
    throw createError({
      statusCode: 500,
      message: err.message || "Failed to refresh source."
    })
  }
})
