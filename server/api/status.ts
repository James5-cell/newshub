import { getSourceStatusTable, getUserRefreshLimitsTable } from "#/database/status"
import { getCustomSourceTable } from "#/database/source-config"
import { sources } from "@shared/sources"

export default defineEventHandler(async (event) => {
  try {
    const statusTable = await getSourceStatusTable()
    if (!statusTable) {
      throw new Error("Cannot load source status table")
    }

    const statuses = await statusTable.getAll()
    const statusMap = new Map(statuses.map(s => [s.id, s]))

    // Retrieve all active source IDs to ensure we return all of them
    const staticIds = Object.keys(sources)
    
    const customTable = await getCustomSourceTable()
    const customSources = customTable ? await customTable.getActive() : []
    const customIds = customSources.map(cs => cs.id)
    
    const allIds = Array.from(new Set([...staticIds, ...customIds]))

    const result = allIds.map(id => {
      const dbStatus = statusMap.get(id)
      return {
        id,
        last_attempt_at: dbStatus?.last_attempt_at ?? 0,
        last_success_at: dbStatus?.last_success_at ?? 0,
        status: dbStatus?.status ?? 'unknown',
        error_message: dbStatus?.error_message ?? ''
      }
    })

    let userLimit = null
    const user = event.context.user
    if (user && user.id) {
      const limitsTable = await getUserRefreshLimitsTable()
      if (limitsTable) {
        const limitInfo = await limitsTable.get(user.id)
        if (limitInfo) {
          userLimit = {
            count: limitInfo.count,
            limit: 3,
            resetAt: limitInfo.reset_at
          }
        } else {
          userLimit = {
            count: 0,
            limit: 3,
            resetAt: 0
          }
        }
      }
    }

    return {
      status: "success",
      data: result,
      userLimit
    }
  } catch (err: any) {
    logger.error("Failed to fetch source status:", err)
    throw createError({
      statusCode: 500,
      message: err.message || "Internal Server Error"
    })
  }
})
