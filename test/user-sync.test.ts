import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type Database, createDatabase } from "db0"
import sqliteConnector from "db0/connectors/better-sqlite3"
import { createApp, defineEventHandler, toWebHandler } from "h3"
import syncHandler from "#/api/me/sync"
import { UserTable } from "#/database/user"

let db: Database
const app = createApp()
app.use(defineEventHandler((event) => {
  event.context.user = { id: "reader" }
}))
app.use("/api/me/sync", syncHandler)

async function sync(body?: unknown) {
  const response = await toWebHandler(app)(new Request("http://localhost/api/me/sync", {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }))
  expect(response.status).toBe(200)
  return response.json()
}

beforeEach(async () => {
  db = createDatabase(sqliteConnector({ name: ":memory:" }))
  vi.stubGlobal("useDatabase", () => db)
  vi.stubGlobal("logger", { success: vi.fn(), error: vi.fn(), info: vi.fn() })
  const table = new UserTable(db)
  await table.init()
  await table.addUser("reader", "reader@example.org", "github")
})

afterEach(async () => {
  await db.dispose()
  vi.unstubAllGlobals()
})

describe("reader preference sync", () => {
  it("returns the saved order and acknowledges the current revision on late or repeated writes", async () => {
    const latest = {
      data: { hottest: ["weibo", "zhihu"], focus: ["zhihu"] },
      manualOrderByColumn: { hottest: true },
      updatedTime: 42,
    }
    const ack = { ...latest, success: true }
    expect(await sync(latest)).toEqual(ack)
    expect(await sync({ data: { focus: [] }, updatedTime: 41 })).toEqual(ack)
    expect(await sync({ data: { focus: [] }, updatedTime: 42 })).toEqual(ack)
    expect(await sync()).toEqual(latest)
  })

  it("reads legacy rows and accepts clients that send only the source lists", async () => {
    const data = { focus: ["weibo"] }
    await new UserTable(db).setData("reader", JSON.stringify(data), 10)
    expect(await sync()).toEqual({ data, manualOrderByColumn: {}, updatedTime: 10 })
    expect(await sync({ data, updatedTime: 11 })).toEqual({ data, manualOrderByColumn: {}, updatedTime: 11, success: true })
  })
})
