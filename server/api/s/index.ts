import type { SourceID, SourceResponse } from "@shared/types"
import { getters } from "#/getters"
import { getCacheTable } from "#/database/cache"
import { getCustomSourceTable } from "#/database/source-config"
import type { CacheInfo } from "#/types"
import { refreshSource } from "#/utils/refresh"

export default defineEventHandler(async (event): Promise<SourceResponse> => {
  try {
    const query = getQuery(event)
    const latest = query.latest !== undefined && query.latest !== "false"
    let id = query.id as SourceID
    const isValid = (id: SourceID) => !id || !sources[id] || !getters[id]

    // ── 靜態源路徑（原有邏輯不變）──
    if (isValid(id)) {
      const redirectID = sources?.[id]?.redirect
      if (redirectID) id = redirectID

      // Check if static source is hidden by admin
      try {
        const { getOverrideTable } = await import("#/database/source-config")
        const overrideTable = await getOverrideTable()
        if (overrideTable) {
          const hiddenIds = await overrideTable.getHidden()
          if (hiddenIds.includes(id)) {
            throw createError({ statusCode: 403, message: `Source is hidden` })
          }
        }
      } catch (e: any) {
        if (e.statusCode === 403) throw e
        // ignore db error, fail-open
      }

      // ── 動態源 fallback ──
      if (isValid(id)) {
        return await handleCustomSource(event, id as string, latest)
      }
    }

    const cacheTable = await getCacheTable()
    // Date.now() in Cloudflare Worker will not update throughout the entire runtime.
    const now = Date.now()
    let cache: CacheInfo | undefined
    if (cacheTable) {
      cache = await cacheTable.get(id)
      if (cache) {
      // if (cache) {
        // interval 刷新间隔，对于缓存失效也要执行的。本质上表示本来内容更新就很慢，这个间隔内可能内容压根不会更新。
        // 默认 10 分钟，是低于 TTL 的，但部分 Source 的更新间隔会超过 TTL，甚至有的一天更新一次。
        if (now - cache.updated < sources[id].interval) {
          return {
            status: "success",
            id,
            updatedTime: now,
            items: cache.items,
          }
        }

        // 而 TTL 缓存失效时间，在时间范围内，就算内容更新了也要用这个缓存。
        // 复用缓存是不会更新时间的。
        if (now - cache.updated < TTL) {
          // 有 latest
          // 没有 latest，但服务器禁止登录

          // 没有 latest
          // 有 latest，服务器可以登录但没有登录
          if (!latest || (!event.context.disabledLogin && !event.context.user)) {
            return {
              status: "cache",
              id,
              updatedTime: cache.updated,
              items: cache.items,
            }
          }
        }
      }
    }

    try {
      const result = await refreshSource(id)
      return {
        status: "success",
        id,
        updatedTime: result.updatedTime,
        items: result.items,
      }
    } catch (e) {
      // ── Stale-While-Revalidate: scrape failed, serve expired cache as fallback ──
      // This prevents a 500 error from reaching the user when the target site is
      // temporarily unavailable (timeout, 403, 502, etc.).
      if (cache!) {
        logger.warn(`[SWR] Refresh failed for "${id}", serving stale cache (age: ${Math.round((Date.now() - cache.updated) / 1000)}s)`)
        return {
          status: "stale",
          id,
          updatedTime: cache.updated,
          items: cache.items,
        }
      } else {
        throw e
      }
    }
  } catch (e: any) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})

/**
 * 處理動態源（custom_sources 表中的 Buzzing 源）
 * 當靜態 sources 中找不到 id 時，fallback 到此邏輯
 */
async function handleCustomSource(event: any, id: string, latest: boolean): Promise<SourceResponse> {
  const customTable = await getCustomSourceTable()
  if (!customTable) {
    throw new Error("Invalid source id")
  }

  const customSource = await customTable.getById(id)
  if (!customSource || !customSource.is_active) {
    throw new Error("Invalid source id")
  }

  const cacheTable = await getCacheTable()
  const now = Date.now()
  let cache: CacheInfo | undefined

  // 複用快取邏輯
  if (cacheTable) {
    cache = await cacheTable.get(id)
    if (cache) {
      if (now - cache.updated < customSource.interval_ms) {
        return {
          status: "success",
          id: id as SourceID,
          updatedTime: now,
          items: cache.items,
        }
      }
      if (now - cache.updated < TTL) {
        if (!latest || (!event.context.disabledLogin && !event.context.user)) {
          return {
            status: "cache",
            id: id as SourceID,
            updatedTime: cache.updated,
            items: cache.items,
          }
        }
      }
    }
  }

  // 動態抓取
  try {
    const result = await refreshSource(id)
    return {
      status: "success",
      id: id as SourceID,
      updatedTime: result.updatedTime,
      items: result.items,
    }
  } catch (e) {
    // ── Stale-While-Revalidate: scrape failed, serve expired cache as fallback ──
    if (cache!) {
      logger.warn(`[SWR] Refresh failed for custom source "${id}", serving stale cache (age: ${Math.round((Date.now() - cache.updated) / 1000)}s)`)
      return {
        status: "stale",
        id: id as SourceID,
        updatedTime: cache.updated,
        items: cache.items,
      }
    } else {
      throw e
    }
  }
}
