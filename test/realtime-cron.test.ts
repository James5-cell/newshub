import { afterEach, describe, expect, it, vi } from "vitest"
import { createApp, toWebHandler } from "h3"
import handler from "#/api/cron/realtime.post"
import auth from "#/middleware/auth"

const { definitions, batch } = vi.hoisted(() => ({
  definitions: vi.fn().mockResolvedValue([{ id: "jin10", realtime: true }, { id: "weibo", realtime: false }]),
  batch: vi.fn().mockResolvedValue({ summary: { checked: 1 } }),
}))
vi.mock("#/utils/refresh", () => ({ getRefreshDefinitions: definitions, refreshSourceBatch: batch }))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
async function request(secret?: string) {
  vi.stubEnv("JWT_SECRET", "")
  const app = createApp()
  app.use(auth)
  app.use("/api/cron/realtime", handler)
  return toWebHandler(app)(new Request("http://localhost/api/cron/realtime", {
    method: "POST",
    headers: secret ? { "x-cron-secret": secret } : {},
  }))
}
describe("realtime scheduler authentication", () => {
  it("rejects a missing secret before reading source configuration", async () => {
    vi.stubEnv("CRON_SECRET", "scheduler-test")
    expect((await request()).status).toBe(401)
    expect(definitions).not.toHaveBeenCalled()
  })
  it("refreshes only realtime sources without requiring OAuth", async () => {
    vi.stubEnv("CRON_SECRET", "scheduler-test")
    expect((await request("scheduler-test")).status).toBe(200)
    expect(batch).toHaveBeenCalledWith(["jin10"])
  })
})
