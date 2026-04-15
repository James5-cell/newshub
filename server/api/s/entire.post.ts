import type { SourceID, SourceResponse } from "@shared/types"
import { getCacheTable } from "#/database/cache"

export default defineEventHandler(async (event) => {
  try {
    const { sources: _ }: { sources: SourceID[] } = await readBody(event)
    const cacheTable = await getCacheTable()
    let customTable: any = null
    try {
      const { getCustomSourceTable } = await import("#/database/source-config")
      customTable = await getCustomSourceTable()
    } catch {}

    const customSources: Record<string, any> = {}
    if (customTable) {
      const allCustom = await customTable.getAll()
      allCustom.forEach((s: any) => { customSources[s.id] = s })
    }

    let hiddenSet = new Set<string>()
    try {
      const { getOverrideTable } = await import("#/database/source-config")
      const overrideTable = await getOverrideTable()
      if (overrideTable) {
        hiddenSet = new Set(await overrideTable.getHidden())
      }
    } catch {}

    const ids = _?.filter(k => (sources[k] || customSources[k]) && !hiddenSet.has(k))
    if (ids?.length && cacheTable) {
      const caches = await cacheTable.getEntire(ids)
      const now = Date.now()
      return caches.map(cache => {
        const interval = sources[cache.id]?.interval ?? customSources[cache.id]?.interval_ms ?? 600000;
        return {
          status: "cache",
          id: cache.id,
          items: cache.items,
          updatedTime: now - cache.updated < interval ? now : cache.updated,
        }
      }) as SourceResponse[]
    }
  } catch {
    //
  }
})
