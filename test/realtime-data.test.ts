import { afterEach, describe, expect, it, vi } from "vitest"
import { relativeTime } from "@shared/utils"
import { MIN_SOURCE_INTERVAL, getRefreshInterval } from "@shared/refresh-policy"
import { parseRSS } from "#/utils/rss2json"
import { tranformToUTC } from "#/utils/date"
import jin10 from "#/sources/jin10"
import { createRSSGetter } from "#/utils/rss-source"

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock("#/utils/fetch", () => ({ myFetch: fetch }))
vi.mock("#/utils/feed-fetch", () => ({ fetchFeed: fetch }))
vi.mock("#/getters", () => ({ getters: {} }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("realtime data correctness", () => {
  it("converts Jin10's Shanghai wall clock to an absolute instant", () => {
    expect(tranformToUTC("2026-10-03 11:13:18", "YYYY-MM-DD HH:mm:ss", "Asia/Shanghai"))
      .toBe(Date.parse("2026-10-03T03:13:18Z"))
  })
  it("does not describe a future timestamp as fresh news", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-03T03:20:00Z"))
    expect(relativeTime("2026-10-03T11:13:18Z")).toBe("时间待校准")
    expect(relativeTime("2026-10-03T03:13:18Z")).toBe("6分钟前")
  })
  it("preserves RSS string GUIDs and Atom original publication times", () => {
    const rss = parseRSS("<rss><channel><item><guid>native-1</guid><title>News</title><link>https://example.com/1</link><pubDate>Fri, 02 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>")
    expect((rss.items[0] as any).id).toBe("native-1")
    const atom = parseRSS("<feed><entry><id>native-2</id><title>News</title><published>2026-10-02T12:00:00Z</published><updated>2026-10-02T15:00:00Z</updated><link rel=\"self\" href=\"https://example.com/feed\"/><link rel=\"alternate\" href=\"https://example.com/2\"/></entry></feed>")
    expect(atom.items[0].created).toBe("2026-10-02T12:00:00Z")
    expect(atom.items[0].link).toBe("https://example.com/2")
  })
  it("fetches a JSON feed once even when the URL has no json extension", async () => {
    fetch.mockResolvedValue(JSON.stringify({ items: [{ id: "1", title: "News", url: "https://example.com/1" }] }))
    expect(await createRSSGetter("https://example.com/feed")()).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it("preserves the full Jin10 message and native ID", async () => {
    fetch.mockResolvedValue(`var newest = ${JSON.stringify([{ id: "flash-1", time: "2026-10-03 11:13:18", data: { content: "【政策消息】正文不能只放在鼠标悬停提示中" }, channel: [], important: 1 }])};`)
    const items = await jin10()
    expect(items[0].title).toBe("【政策消息】正文不能只放在鼠标悬停提示中")
    expect(items[0].id).toBe("flash-1")
    expect(items[0].pubDate).toBe(Date.parse("2026-10-03T03:13:18Z"))
  })
  it("accelerates only selected high frequency sources", () => {
    expect(getRefreshInterval(600_000, "jin10")).toBe(120_000)
    expect(getRefreshInterval(600_000, "daily-rss")).toBe(600_000)
    expect(getRefreshInterval(60_000)).toBe(MIN_SOURCE_INTERVAL)
  })
})
