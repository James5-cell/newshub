import { getters } from "#/getters"
import { getCacheTable } from "#/database/cache"
import { getCustomSourceTable, getOverrideTable } from "#/database/source-config"
import { getSourceStatusTable } from "#/database/status"
import { createBuzzingGetter } from "#/sources/buzzing"
import { rss2json } from "./rss2json"
import type { NewsItem } from "@shared/types"

export function createRSSGetter(feedUrl: string) {
  return async (): Promise<NewsItem[]> => {
    if (!feedUrl) {
      throw new Error("Feed URL is empty")
    }

    // Try JSON Feed first if url ends with .json
    if (feedUrl.endsWith(".json")) {
      try {
        const data = await myFetch(feedUrl) as any
        const items = data?.items || []
        if (items.length) {
          return items.map((item: any) => ({
            id: item.id || item.url || item.link,
            title: item.title || "",
            url: item.url || item.link || "",
            pubDate: item.date_published || item._original_published || item.pubDate,
          }))
        }
      } catch (err) {
        logger.error(`Failed to parse feedUrl ${feedUrl} as JSON feed, fallback to XML`, err)
      }
    }

    const rssData = await rss2json(feedUrl)
    if (!rssData || !rssData.items || !rssData.items.length) {
      // Fallback: try parsing raw body as JSON just in case content type is JSON without .json extension
      try {
        const raw = await myFetch(feedUrl)
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
        const items = parsed?.items || []
        if (items.length) {
          return items.map((item: any) => ({
            id: item.id || item.url || item.link,
            title: item.title || "",
            url: item.url || item.link || "",
            pubDate: item.date_published || item._original_published || item.pubDate,
          }))
        }
      } catch {
        // ignore
      }
      throw new Error(`Cannot parse RSS data or empty items for url: ${feedUrl}`)
    }

    return rssData.items.map((item: any) => {
      let pubDate: number | undefined
      if (item.created) {
        const parsedDate = Date.parse(item.created)
        if (!isNaN(parsedDate)) {
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

export async function refreshSource(id: string) {
  const cacheTable = await getCacheTable()
  const statusTable = await getSourceStatusTable()
  const now = Date.now()

  // Get current status to preserve last_success_at
  const currentStatus = statusTable ? await statusTable.get(id) : undefined
  const lastSuccessAt = currentStatus?.last_success_at ?? 0

  try {
    let newData: any[] = []
    
    // Check if it is a static source or a custom source
    if (getters[id as SourceID]) {
      newData = (await getters[id as SourceID]()).slice(0, 30)
    } else {
      const customTable = await getCustomSourceTable()
      const customSource = customTable ? await customTable.getById(id) : undefined
      if (customSource && customSource.is_active) {
        let getter: () => Promise<NewsItem[]>
        if (customSource.provider === "buzzing") {
          getter = createBuzzingGetter(customSource.subdomain || "")
        } else {
          // Handled by generic RSS getter (rss, rsshub, etc.)
          getter = createRSSGetter(customSource.feed_url)
        }
        newData = (await getter()).slice(0, 30)
      } else {
        throw new Error(`Source ${id} not found or inactive`)
      }
    }

    if (cacheTable && newData.length) {
      await cacheTable.set(id, newData)
    } else if (newData.length === 0) {
      throw new Error(`Scraped data is empty for source ${id}`)
    }

    if (statusTable) {
      await statusTable.set({
        id,
        last_attempt_at: now,
        last_success_at: now,
        status: 'success',
        error_message: ""
      })
    }

    return {
      status: "success",
      items: newData,
      updatedTime: now
    }
  } catch (e: any) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    logger.error(`Failed to refresh source ${id}:`, e)
    
    if (statusTable) {
      await statusTable.set({
        id,
        last_attempt_at: now,
        last_success_at: lastSuccessAt,
        status: 'failed',
        error_message: errorMsg
      })
    }
    
    throw e
  }
}

export async function refreshAllSources() {
  // Get all active sources: static and custom
  const overrideTable = await getOverrideTable()
  const hiddenIds = overrideTable ? await overrideTable.getHidden() : []
  const staticIds = Object.keys(sources).filter(id => !hiddenIds.includes(id)) as string[]

  const customTable = await getCustomSourceTable()
  const customSources = customTable ? await customTable.getActive() : []
  const customIds = customSources.map(cs => cs.id)

  const allIds = Array.from(new Set([...staticIds, ...customIds]))

  // We want to run them with a concurrency limit of 5.
  const limit = 5
  const results: { id: string; success: boolean; error?: any }[] = []
  
  const queue = [...allIds]
  
  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift()
      if (!id) break
      
      try {
        await refreshSource(id)
        results.push({ id, success: true })
      } catch (e) {
        results.push({ id, success: false, error: e })
      }
    }
  }

  // Start workers
  const workers = Array.from({ length: Math.min(limit, queue.length) }, () => worker())
  await Promise.all(workers)
  
  return results
}
