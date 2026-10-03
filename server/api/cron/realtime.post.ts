import process from "node:process"
import { createError, defineEventHandler, getHeader } from "h3"
import { getRefreshDefinitions, refreshSourceBatch } from "#/utils/refresh"

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  if (!secret) throw createError({ statusCode: 503, message: "CRON_SECRET is not configured" })
  if (getHeader(event, "x-cron-secret") !== secret) {
    throw createError({ statusCode: 401, message: "Invalid cron secret" })
  }
  const ids = (await getRefreshDefinitions()).filter(source => source.realtime).map(source => source.id)
  if (!ids.length) return { summary: { checked: 0 } }
  // Uses the same leases, failure backoff and D1 cache as guest refreshes.
  return refreshSourceBatch(ids)
})
