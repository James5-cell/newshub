import type { SourceID, SourceResponse } from "@shared/types"
import { createError, defineEventHandler, readBody, setHeader } from "h3"
import { MAX_REFRESH_SOURCES } from "@shared/refresh-policy"
import { getCacheTable } from "#/database/cache"
import { getRefreshDefinitions } from "#/utils/refresh"

export default defineEventHandler(async (event): Promise<SourceResponse[]> => {
  const body = await readBody(event)
  if (!Array.isArray(body?.sources) || body.sources.length > MAX_REFRESH_SOURCES
    || body.sources.some((id: unknown) => typeof id !== "string" || !id || id.length > 120)) {
    throw createError({ statusCode: 400, message: "请提供有效的来源列表" })
  }
  if (!body.sources.length) return []
  const definitions = await getRefreshDefinitions(body.sources)
  const cacheTable = await getCacheTable()
  if (!cacheTable) throw createError({ statusCode: 503, message: "共享缓存暂时不可用" })
  const intervals = new Map(definitions.map(source => [source.id, source.interval]))
  const caches = await cacheTable.getEntire(definitions.map(source => source.id))
  setHeader(event, "Cache-Control", "no-store")
  return caches.map(cache => ({
    status: Date.now() < cache.updated + intervals.get(cache.id)! ? "cache" : "stale",
    id: cache.id as SourceID,
    items: cache.items,
    updatedTime: cache.updated,
    nextRefreshAt: cache.updated + intervals.get(cache.id)!,
  }))
})
