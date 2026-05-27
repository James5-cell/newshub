import { refreshAllSources } from "../utils/refresh"

export default defineNitroPlugin((nitroApp) => {
  if (process.env.CF_PAGES) {
    logger.info("CF Pages environment detected, scheduler plugin disabled.")
    return
  }

  logger.success("Initializing global background scheduler (target 00:00 and 12:00 UTC+8)...")

  // Check every minute
  setInterval(async () => {
    const now = new Date()
    // Calculate current time in UTC+8
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
    const utc8Time = new Date(utcTime + (3600000 * 8))

    const hours = utc8Time.getHours()
    const minutes = utc8Time.getMinutes()

    // Trigger exactly at 00:00 and 12:00 UTC+8
    if ((hours === 0 || hours === 12) && minutes === 0) {
      logger.info(`Scheduler triggered at ${hours.toString().padStart(2, '0')}:00 UTC+8. Running full refresh...`)
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
