import process from "node:process"
import { getRefreshDefinitions, refreshAllSources, refreshSourceBatch } from "../utils/refresh"

export default defineNitroPlugin((_nitroApp) => {
  // Disable scheduler in serverless / worker environments (like Cloudflare Pages or Vercel)
  // Cloudflare Workers disallow calling setInterval/setTimeout in the global/initialization scope.
  if (
    typeof (globalThis as any).caches !== "undefined"
    || typeof (globalThis as any).WebSocketPair !== "undefined"
    || process.env.CF_PAGES
    || process.env.VERCEL
  ) {
    logger.info("Serverless/Cloudflare environment detected, scheduler plugin disabled.")
    return
  }

  logger.success("Initializing realtime scheduler (every minute) and twice-daily full refresh...")

  // Keep the same shared cache warm even without visitors.
  let running = false
  setInterval(async () => {
    if (running) return
    running = true
    try {
      const realtime = (await getRefreshDefinitions()).filter(source => source.realtime).map(source => source.id)
      if (realtime.length) await refreshSourceBatch(realtime)
    } catch (error) {
      logger.error("Realtime scheduled refresh failed", error)
    } finally {
      running = false
    }
    const now = new Date()
    // Calculate current time in UTC+8
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
    const utc8Time = new Date(utcTime + (3600000 * 8))

    const hours = utc8Time.getHours()
    const minutes = utc8Time.getMinutes()

    // Trigger exactly at 00:00 and 12:00 UTC+8
    if ((hours === 0 || hours === 12) && minutes === 0) {
      logger.info(`Scheduler triggered at ${hours.toString().padStart(2, "0")}:00 UTC+8. Running full refresh...`)
      try {
        const results = await refreshAllSources()
        const succeeded = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length
        logger.success(`Scheduled full refresh completed. Succeeded: ${succeeded}, Failed: ${failed}`)
      } catch (err) {
        logger.error("Failed running scheduled full refresh:", err)
      }
    }
  }, 60 * 1000)
})
