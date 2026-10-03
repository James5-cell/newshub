import { afterEach, expect, it, vi } from "vitest"
import { fetchFeed } from "#/utils/feed-fetch"
import { parseRSS } from "#/utils/rss2json"
afterEach(() => vi.unstubAllGlobals())
it("rejects chunked oversized feeds before parsing", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(512 * 1024 + 1))))
  await expect(fetchFeed("https://example.com/feed")).rejects.toThrow("size limit")
})
it("rejects custom XML entity declarations", () => {
  expect(() => parseRSS('<!DOCTYPE rss [<!ENTITY text "value">]><rss/>')).toThrow("declarations")
})
it("passes cancellation to the underlying request", async () => {
  const controller = new AbortController()
  controller.abort()
  const request = vi.fn().mockImplementation((_url, options) => {
    expect(options.signal.aborted).toBe(true)
    throw new Error("aborted")
  })
  vi.stubGlobal("fetch", request)
  await expect(fetchFeed("https://example.com/feed", controller.signal)).rejects.toThrow("aborted")
})
it("rejects a redirect to a private network address", async () => {
  const request = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }))
  vi.stubGlobal("fetch", request)
  await expect(fetchFeed("https://example.com/feed")).rejects.toThrow("public HTTP")
  expect(request).toHaveBeenCalledTimes(1)
})
