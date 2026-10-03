import type { NewsItem } from "@shared/types"
import { fetchFeed } from "./feed-fetch"
import { parseRSS } from "./rss2json"

export function createRSSGetter(feedUrl: string) {
  return async (context?: { signal?: AbortSignal }): Promise<NewsItem[]> => {
    if (!feedUrl) {
      throw new Error("Feed URL is empty")
    }

    // Fetch once; format detection must not repeat the upstream request.
    const raw = await fetchFeed(feedUrl, context?.signal)
    if (raw.length > 512 * 1024) throw new Error("Feed exceeds size limit")
    const text = raw.trim()
    if (text.startsWith("{")) {
      const data = JSON.parse(text)
      if (!Array.isArray(data.items) || !data.items.length) throw new Error("Empty JSON feed")
      return data.items.slice(0, 100).map((item: any) => ({
        id: item.id || item.url || item.link,
        title: item.title || "",
        url: item.url || item.link || "",
        pubDate: item.date_published || item._original_published || item.pubDate,
      }))
    }
    const rssData = parseRSS(text)
    if (!rssData.items.length) throw new Error("Empty RSS feed")

    return rssData.items.map((item: any) => {
      let pubDate: number | undefined
      if (item.created) {
        const parsedDate = Date.parse(item.created)
        if (!Number.isNaN(parsedDate)) {
          pubDate = parsedDate
        }
      }
      return {
        id: item.id || item.link,
        title: item.title || "",
        url: item.link || "",
        pubDate,
      }
    })
  }
}
