export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const url = new URL("/api/cron/realtime", env.NEWSHUB_URL)
      if (url.protocol !== "https:") throw new Error("NEWSHUB_URL must use HTTPS")
      const response = await fetch(url, {
        method: "POST",
        headers: { "x-cron-secret": env.CRON_SECRET },
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) throw new Error(`Realtime refresh failed: ${response.status}`)
      const result = await response.json()
      if (result.summary?.failed) console.warn("Sources failed", result.errors)
    })())
  },
}
