import process from "node:process"
import { refreshAllSources } from "#/utils/refresh"

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw createError({
      statusCode: 500,
      message: "CRON_SECRET environment variable is not configured."
    })
  }

  const clientSecret = getHeader(event, "x-cron-secret")
  if (clientSecret !== cronSecret) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Invalid x-cron-secret header."
    })
  }

  logger.info("Cron API endpoint triggered. Running full refresh...")
  try {
    const results = await refreshAllSources()
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    return {
      status: "success",
      message: "Full refresh completed.",
      summary: {
        total: results.length,
        succeeded,
        failed
      },
      details: results.map(r => ({ id: r.id, success: r.success, error: r.error?.message }))
    }
  } catch (err: any) {
    logger.error("Cron full refresh failed:", err)
    throw createError({
      statusCode: 500,
      message: err.message || "Failed to refresh all sources."
    })
  }
})
