import process from "node:process"
import type { NewsItem, SourceID, SourceResponse } from "@shared/types"
import { createError } from "h3"
import { sources } from "@shared/sources"
import { FAILED_REFRESH_BACKOFF, REFRESH_BATCH_SIZE, REFRESH_LEASE_MS, SOURCE_FETCH_TIMEOUT, getRefreshInterval } from "@shared/refresh-policy"
import { randomUUID } from "uncrypto"
import { createRSSGetter } from "./rss-source"
import { getters } from "#/getters"
import type { SourceGetter } from "#/types"
import { getRefreshControl } from "#/database/refresh-control"
import { getCacheTable } from "#/database/cache"
import { getCustomSourceTable, getOverrideTable } from "#/database/source-config"
import { getSourceStatusTable } from "#/database/status"
import { createBuzzingGetter } from "#/sources/buzzing"

export interface RefreshDefinition {
  id: string
  interval: number
  getter: SourceGetter
  realtime?: boolean
}

export async function getRefreshDefinitions(ids?: string[]): Promise<RefreshDefinition[]> {
  const overrideTable = await getOverrideTable()
  if (!overrideTable) throw createError({ statusCode: 503, message: "暂时无法检查来源配置，请稍后重试" })
  const hidden = new Set(await overrideTable.getHidden())
  const requested = ids && new Set(ids.filter(id => !hidden.has(id)).map(id => sources[id as SourceID]?.redirect ?? id))
  const definitions: RefreshDefinition[] = []
  for (const [id, source] of Object.entries(sources)) {
    if (source.redirect || hidden.has(id) || (requested && !requested.has(id)) || !getters[id as SourceID]) continue
    definitions.push({ id, interval: getRefreshInterval(source.interval, id), realtime: source.type === "realtime", getter: getters[id as SourceID] })
  }
  // Static-only requests do not need to load or migrate the custom source table.
  if (!requested || [...requested].some(id => !definitions.some(source => source.id === id) && !sources[id as SourceID])) {
    const customTable = await getCustomSourceTable()
    if (!customTable) throw createError({ statusCode: 503, message: "暂时无法检查自定义来源，请稍后重试" })
    for (const source of await customTable.getActive()) {
      if (hidden.has(source.id) || (requested && !requested.has(source.id))) continue
      definitions.push({
        id: source.id,
        interval: getRefreshInterval(source.interval_ms),
        realtime: source.type === "realtime",
        getter: source.provider === "buzzing" ? createBuzzingGetter(source.subdomain || "") : createRSSGetter(source.feed_url),
      })
    }
  }
  return definitions
}

const inflightRefreshes = new Map<string, Promise<SourceResponse>>()

// Fast in-instance deduplication, backed by an atomic D1 lease across instances.
export function refreshSource(id: string, options: { force?: boolean, definition?: RefreshDefinition } = {}): Promise<SourceResponse> {
  // Worker requests must not await another request's pending network I/O.
  if (process.env.CF_PAGES || "WebSocketPair" in globalThis) return refreshSharedSource(id, options)
  const inflight = inflightRefreshes.get(id)
  if (inflight) return inflight
  const promise = refreshSharedSource(id, options).finally(() => inflightRefreshes.delete(id))
  inflightRefreshes.set(id, promise)
  return promise
}

async function refreshSharedSource(id: string, options: { force?: boolean, definition?: RefreshDefinition }): Promise<SourceResponse> {
  const definition = options.definition ?? (await getRefreshDefinitions([id]))[0]
  if (!definition) throw createError({ statusCode: 404, message: "来源不存在或已停用" })
  id = definition.id
  const cacheTable = await getCacheTable()
  if (!cacheTable) throw createError({ statusCode: 503, message: "共享缓存暂时不可用，请稍后重试" })
  let cache = await cacheTable.get(id)
  const now = Date.now()
  const cachedResponse = (status: "cache" | "stale", nextRefreshAt: number): SourceResponse => ({
    id: id as SourceID,
    status,
    items: cache!.items,
    updatedTime: cache!.updated,
    nextRefreshAt,
  })
  if (!options.force && cache && now < cache.updated + definition.interval) {
    return cachedResponse("cache", cache.updated + definition.interval)
  }

  const statusTable = await getSourceStatusTable()
  if (!statusTable) throw createError({ statusCode: 503, message: "更新状态暂时不可用，请稍后重试" })
  const previousStatus = await statusTable.get(id)
  const retryAt = (previousStatus?.last_attempt_at ?? 0) + FAILED_REFRESH_BACKOFF
  if (!options.force && previousStatus?.status === "failed" && now < retryAt) {
    if (cache) return cachedResponse("stale", retryAt)
    throw createError({ statusCode: 503, message: "此来源暂时不可用，将稍后重试" })
  }

  const control = await getRefreshControl()
  const token = randomUUID()
  if (!await control.acquire(id, token, now, REFRESH_LEASE_MS)) {
    if (cache) return cachedResponse("stale", now + REFRESH_LEASE_MS)
    throw createError({ statusCode: 503, message: "此来源正在更新，请稍后重试" })
  }
  try {
    // Another instance may have finished between our first cache read and lease.
    cache = await cacheTable.get(id)
    if (!options.force && cache && Date.now() < cache.updated + definition.interval) {
      return cachedResponse("cache", cache.updated + definition.interval)
    }
    // Recheck failure cooldown after acquiring, for the same race on failures.
    const latestStatus = await statusTable.get(id)
    const latestRetryAt = (latestStatus?.last_attempt_at ?? 0) + FAILED_REFRESH_BACKOFF
    if (!options.force && latestStatus?.status === "failed" && Date.now() < latestRetryAt) {
      if (cache) return cachedResponse("stale", latestRetryAt)
      throw createError({ statusCode: 503, message: "此来源暂时不可用，将稍后重试" })
    }
    try {
      let timer: ReturnType<typeof setTimeout> | undefined
      let items: NewsItem[]
      const controller = new AbortController()
      try {
        // Finish before the lease expires; late upstream responses cannot write
        // over a newer refresh after ownership passes to another instance.
        items = (await Promise.race([
          definition.getter({ signal: controller.signal }),
          new Promise<NewsItem[]>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort()
              reject(new Error("Source refresh timed out"))
            }, SOURCE_FETCH_TIMEOUT)
          }),
        ]))
        const seen = new Set<string>()
        items = items.filter((item) => {
          const key = String(item.id ?? item.url ?? "")
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        }).slice(0, 30)
      } finally {
        clearTimeout(timer)
        controller.abort()
      }
      if (!items.length) throw new Error(`Scraped data is empty for source ${id}`)
      const updatedTime = await cacheTable.set(id, items)
      await statusTable.set({ id, last_attempt_at: updatedTime, last_success_at: updatedTime, status: "success", error_message: "" })
      return { id: id as SourceID, status: "success", items, updatedTime, nextRefreshAt: updatedTime + definition.interval }
    } catch (error) {
      const attemptedAt = Date.now()
      await statusTable.set({
        id,
        last_attempt_at: attemptedAt,
        last_success_at: latestStatus?.last_success_at ?? 0,
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      })
      logger.error(`Failed to refresh source ${id}:`, error)
      if (cache) return cachedResponse("stale", attemptedAt + FAILED_REFRESH_BACKOFF)
      throw createError({ statusCode: 502, message: "此来源更新失败，请稍后重试" })
    }
  } finally {
    await control.release(id, token)
  }
}

export async function refreshSourceBatch(ids: string[]) {
  const definitions = await getRefreshDefinitions(ids)
  if (!definitions.length) throw createError({ statusCode: 404, message: "没有可更新的来源" })
  const cacheTable = await getCacheTable()
  if (!cacheTable) throw createError({ statusCode: 503, message: "共享缓存暂时不可用，请稍后重试" })
  const caches = new Map((await cacheTable.getEntire(definitions.map(source => source.id))).map(cache => [cache.id as string, cache]))
  const statusTable = await getSourceStatusTable()
  if (!statusTable) throw createError({ statusCode: 503, message: "更新状态暂时不可用，请稍后重试" })
  const statuses = new Map((await statusTable.getMany(definitions.map(source => source.id))).map(status => [status.id, status]))
  const now = Date.now()
  const nextRefreshAt = (source: RefreshDefinition) => Math.max(
    (caches.get(source.id)?.updated ?? 0) + source.interval,
    statuses.get(source.id)?.status === "failed" ? statuses.get(source.id)!.last_attempt_at + FAILED_REFRESH_BACKOFF : 0,
  )
  // Oldest eligible sources first, so a failing source cannot monopolize a batch.
  const due = definitions.filter(source => now >= nextRefreshAt(source))
    .sort((a, b) => (caches.get(a.id)?.updated ?? 0) - (caches.get(b.id)?.updated ?? 0))
  const selected = due.slice(0, REFRESH_BATCH_SIZE)
  const responses = new Map<string, SourceResponse>()
  for (const source of definitions) {
    const cache = caches.get(source.id)
    if (cache) {
      responses.set(source.id, {
        id: source.id as SourceID,
        status: now < cache.updated + source.interval ? "cache" : "stale",
        items: cache.items,
        updatedTime: cache.updated,
        nextRefreshAt: nextRefreshAt(source),
      })
    }
  }
  const errors: { id: string, message: string }[] = []
  // Bound both upstream concurrency and per-invocation work on Workers Free.
  await Promise.all(selected.map(async (source) => {
    try {
      const response = await refreshSource(source.id, { definition: source })
      responses.set(source.id, response)
      if (response.status === "stale") errors.push({ id: source.id, message: "来源暂未更新，保留上次内容" })
    } catch (error) {
      errors.push({ id: source.id, message: error instanceof Error ? error.message : "更新失败" })
    }
  }))
  const data = [...responses.values()]
  return {
    data,
    errors,
    summary: {
      checked: definitions.length,
      refreshed: data.filter(response => response.status === "success").length,
      cached: data.filter(response => response.status === "cache").length,
      failed: errors.length,
      deferred: due.length - selected.length,
    },
  }
}

export async function refreshAllSources(options: { force?: boolean } = {}) {
  const definitions = await getRefreshDefinitions()
  const results: { id: string, success: boolean, error?: Error }[] = []
  // Trusted Node scheduler/cron/admin entry points; ordinary users use bounded batches.
  for (const definition of definitions) {
    try {
      const response = await refreshSource(definition.id, { ...options, definition })
      results.push({ id: definition.id, success: response.status !== "stale" })
    } catch (error) {
      results.push({ id: definition.id, success: false, error: error instanceof Error ? error : new Error(String(error)) })
    }
  }
  return results
}
