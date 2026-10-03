import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type Database, createDatabase } from "db0"
import sqliteConnector from "db0/connectors/better-sqlite3"
import { createApp, toWebHandler } from "h3"
import { FAILED_REFRESH_BACKOFF, MIN_SOURCE_INTERVAL, PUBLIC_REFRESH_WINDOW, SOURCE_FETCH_TIMEOUT } from "@shared/refresh-policy"
import { getUserRefreshLimitsTable } from "#/database/status"
import { RefreshControl, getRefreshControl } from "#/database/refresh-control"
import { Cache, getCacheTable } from "#/database/cache"
import { getOverrideTable } from "#/database/source-config"
import { initializeTable } from "#/database/init"
import { refreshSource, refreshSourceBatch } from "#/utils/refresh"
import refreshHandler from "#/api/refresh.post"
import sourceHandler from "#/api/s/index"
import cacheHandler from "#/api/s/entire.post"
import authHandler from "#/middleware/auth"

const { getters } = vi.hoisted(() => ({ getters: {
  "weibo": vi.fn(),
  "zhihu": vi.fn(),
  "zaobao": vi.fn(),
  "coolapk": vi.fn(),
  "mktnews-flash": vi.fn(),
} }))
vi.mock("#/getters", () => ({ getters }))

const now = 1_800_000_000_000
const items = [{ id: 1, title: "Fresh news", url: "https://example.com/news" }]
let db: Database

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(now)
  vi.stubEnv("INIT_TABLE", "true")
  vi.stubEnv("ENABLE_CACHE", "true")
  vi.stubEnv("CF_PAGES", "")
  vi.stubEnv("ADMIN_GITHUB_ID", "admin")
  db = createDatabase(sqliteConnector({ name: ":memory:" }))
  vi.stubGlobal("useDatabase", () => db)
  vi.stubGlobal("logger", { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() })
  for (const getter of Object.values(getters)) getter.mockReset().mockResolvedValue(items)
})

afterEach(async () => {
  await db.dispose()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

async function seed(id = "weibo", age = 60_000) {
  const cache = await getCacheTable()
  await cache!.set(id, [{ ...items[0], title: "Older news" }])
  await db.prepare("UPDATE cache SET updated = ? WHERE id = ?").run(now - age, id)
}

async function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  const app = createApp()
  app.use(authHandler)
  app.use("/api/refresh", refreshHandler)
  app.use("/api/s/entire", cacheHandler)
  app.use("/api/s", sourceHandler)
  const response = await toWebHandler(app)(new Request(`http://localhost${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }))
  return { status: response.status, data: await response.json() as any, headers: response.headers }
}

describe("shared source refresh", () => {
  it("serves a fresh cache without changing its successful scrape timestamp", async () => {
    await seed()
    const result = await refreshSource("weibo")
    expect(result.status).toBe("cache")
    expect(result.updatedTime).toBe(now - 60_000)
    expect(result.nextRefreshAt).toBe(now - 60_000 + MIN_SOURCE_INTERVAL)
    expect(getters.weibo).not.toHaveBeenCalled()
  })

  it("lets guests update an expired source and shares it with subsequent readers", async () => {
    await seed("weibo", MIN_SOURCE_INTERVAL)
    expect((await refreshSource("weibo")).status).toBe("success")
    expect((await refreshSource("weibo")).status).toBe("cache")
    expect(getters.weibo).toHaveBeenCalledTimes(1)
  })

  it("shares the same cooldown between a redirect alias and its canonical source", async () => {
    const result = await refreshSource("mktnews")
    expect(result.id).toBe("mktnews-flash")
    expect((await refreshSource("mktnews-flash")).status).toBe("cache")
    expect(getters["mktnews-flash"]).toHaveBeenCalledTimes(1)
  })

  it("times out slow sources before the lease expires and discards late responses", async () => {
    await seed("weibo", 40 * 60_000)
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
    let finish!: (value: typeof items) => void
    getters.weibo.mockImplementation(() => new Promise((resolve) => {
      finish = resolve
    }))
    const pending = refreshSource("weibo")
    await vi.advanceTimersByTimeAsync(0)
    expect(getters.weibo).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(SOURCE_FETCH_TIMEOUT + 1)
    expect((await pending).status).toBe("stale")
    finish(items)
    await vi.advanceTimersByTimeAsync(0)
    const cache = await getCacheTable()
    expect((await cache!.get("weibo"))!.updated).toBe(now - 40 * 60_000)
  })

  it("preserves slower sources' configured interval", async () => {
    await seed("zaobao", 15 * 60_000)
    expect((await refreshSource("zaobao")).status).toBe("cache")
    expect(getters.zaobao).not.toHaveBeenCalled()
  })

  it("serves old content after failure and suppresses repeated attempts", async () => {
    await seed("weibo", 40 * 60_000)
    getters.weibo.mockRejectedValue(new Error("upstream offline"))
    const result = await refreshSource("weibo")
    expect(result.status).toBe("stale")
    expect(result.updatedTime).toBe(now - 40 * 60_000)
    expect(result.nextRefreshAt).toBe(now + FAILED_REFRESH_BACKOFF)
    await refreshSource("weibo")
    expect(getters.weibo).toHaveBeenCalledTimes(1)
    vi.setSystemTime(now + FAILED_REFRESH_BACKOFF)
    getters.weibo.mockResolvedValue(items)
    expect((await refreshSource("weibo")).status).toBe("success")
  })

  it("backs off an empty cold source without repeated upstream requests", async () => {
    getters.weibo.mockResolvedValue([])
    await expect(refreshSource("weibo")).rejects.toMatchObject({ statusCode: 502 })
    await expect(refreshSource("weibo")).rejects.toMatchObject({ statusCode: 503 })
    expect(getters.weibo).toHaveBeenCalledTimes(1)
  })

  it("merges concurrent refreshes in a Node process", async () => {
    await seed("weibo", 40 * 60_000)
    await Promise.all([refreshSource("weibo"), refreshSource("weibo"), refreshSource("weibo")])
    expect(getters.weibo).toHaveBeenCalledTimes(1)
  })

  it("a Worker with another instance's lease serves stale cache instead of scraping", async () => {
    vi.stubEnv("CF_PAGES", "1")
    await seed("weibo", 40 * 60_000)
    const control = await getRefreshControl()
    await control.acquire("weibo", "another-instance", now, 120_000)
    expect((await refreshSource("weibo")).status).toBe("stale")
    expect(getters.weibo).not.toHaveBeenCalled()
  })

  it("rejects hidden sources in both individual and batch paths", async () => {
    const table = await getOverrideTable()
    await table!.upsert("weibo", 1)
    await expect(refreshSource("weibo")).rejects.toMatchObject({ statusCode: 404 })
    await expect(refreshSourceBatch(["weibo"])).rejects.toMatchObject({ statusCode: 404 })
    expect(getters.weibo).not.toHaveBeenCalled()
  })

  it("bounds a batch to three scrapes and advances to other sources next time", async () => {
    const ids = Object.keys(getters)
    const first = await refreshSourceBatch(ids)
    expect(first.summary).toMatchObject({ checked: 5, refreshed: 3, deferred: 2 })
    const second = await refreshSourceBatch(ids)
    expect(second.summary).toMatchObject({ refreshed: 2, cached: 3, deferred: 0 })
    expect(Object.values(getters).map(getter => getter.mock.calls.length)).toEqual([1, 1, 1, 1, 1])
  })
})

describe("atomic database controls", () => {
  it("permits only one independent owner and never releases someone else's lease", async () => {
    const a = new RefreshControl(db)
    const b = new RefreshControl(db)
    await a.init()
    expect(await a.acquire("weibo", "a", now, 1000)).toBe(true)
    expect(await b.acquire("weibo", "b", now, 1000)).toBe(false)
    await b.release("weibo", "b")
    expect(await b.acquire("weibo", "b", now, 1000)).toBe(false)
    expect(await b.acquire("weibo", "b", now + 1000, 1000)).toBe(true)
    await a.release("weibo", "a")
    expect(await a.acquire("weibo", "c", now + 1001, 1000)).toBe(false)
  })

  it("atomically caps concurrent operations and resets an expired window", async () => {
    const control = await getRefreshControl()
    const results = await Promise.all(Array.from({ length: 8 }, () => control.consume("ip-hash", now, 3, PUBLIC_REFRESH_WINDOW)))
    expect(results.filter(result => result.allowed)).toHaveLength(3)
    expect(await control.consume("ip-hash", now + PUBLIC_REFRESH_WINDOW, 3, PUBLIC_REFRESH_WINDOW))
      .toMatchObject({ allowed: true, count: 1 })
  })

  it("initializes once per database instance and retries failures", async () => {
    const init = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined)
    await expect(initializeTable(db, "example", init)).rejects.toThrow("offline")
    await initializeTable(db, "example", init)
    await initializeTable(db, "example", init)
    expect(init).toHaveBeenCalledTimes(2)
  })

  it("binds cache keys and splits queries larger than D1's parameter limit", async () => {
    const cache = new Cache(db)
    await cache.init()
    await cache.set("weibo", items)
    expect(await cache.getEntire(["' OR 1=1 --"])).toEqual([])
    const keys = Array.from({ length: 170 }, (_, index) => `source-${index}`)
    expect(await cache.getEntire([...keys, "weibo"])).toHaveLength(1)
    expect(await cache.getEntire([])).toEqual([])
  })
})

describe("public HTTP refresh", () => {
  it.each([true, false])("works without a login token (OAuth configured: %s)", async (configured) => {
    vi.stubEnv("JWT_SECRET", configured ? "test-secret" : "")
    vi.stubEnv("G_CLIENT_ID", configured ? "test-id" : "")
    vi.stubEnv("G_CLIENT_SECRET", configured ? "test-secret" : "")
    const response = await request("/api/refresh", { source: "weibo" })
    expect(response.status).toBe(200)
    expect(response.data.summary.refreshed).toBe(1)
    expect(response.data.data[0].items).toEqual(items)
  })

  it("returns 429 after three operations even when clients spoof forwarded headers", async () => {
    for (let index = 0; index < 3; index++) {
      expect((await request("/api/refresh", { source: "weibo" })).status).toBe(200)
    }
    const blocked = await request("/api/refresh", { source: "weibo" }, { "x-forwarded-for": "9.9.9.9", "cf-connecting-ip": "8.8.8.8" })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBe("60")
    expect(blocked.data.data.rateLimit.count).toBe(3)
    expect(getters.weibo).toHaveBeenCalledTimes(1)
  })

  it("never lets the legacy latest flag bypass a guest cooldown", async () => {
    await seed()
    const response = await request("/api/s?id=weibo&latest")
    expect(response.status).toBe(200)
    expect(response.data.updatedTime).toBe(now - 60_000)
    expect(getters.weibo).not.toHaveBeenCalled()
  })

  it("returns the true cache timestamp in the batch cache endpoint", async () => {
    await seed()
    const response = await request("/api/s/entire", { sources: ["weibo"] })
    expect(response.status).toBe(200)
    expect(response.data[0].updatedTime).toBe(now - 60_000)
  })

  it("rejects oversized payloads and prevents guests forcing all sources", async () => {
    expect((await request("/api/refresh", { sources: Array.from({ length: 101 }).fill("weibo") })).status).toBe(400)
    expect((await request("/api/refresh", { source: "all" })).status).toBe(403)
    expect((await request("/api/refresh", { source: "weibo", force: true })).status).toBe(403)
  })
})


describe("administrator refresh quota", () => {
  it("atomically caps concurrent requests and resets an expired window", async () => {
    const table = await getUserRefreshLimitsTable()
    const results = await Promise.all(Array.from({ length: 60 }, () => table!.increment("admin")))
    expect(results.filter(Boolean)).toHaveLength(50)
    expect((await table!.get("admin"))?.count).toBe(50)
    vi.setSystemTime(now + 600_000)
    expect((await table!.increment("admin"))?.count).toBe(1)
  })
})
