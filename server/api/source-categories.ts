import { sources } from "@shared/sources"
import { typeSafeObjectEntries } from "@shared/type.util"

export default defineEventHandler(async (event) => {
  // 1. Get custom sources table
  const customSources: any[] = []
  try {
    const { getCustomSourceTable } = await import("#/database/source-config")
    const customTable = await getCustomSourceTable()
    if (customTable) {
      const allActive = await customTable.getActive()
      customSources.push(...allActive)
    }
  } catch (e) {
    // optional database
  }

  // 2. Get static source overrides
  let overrides: any[] = []
  try {
    const { getOverrideTable } = await import("#/database/source-config")
    const overrideTable = await getOverrideTable()
    if (overrideTable) {
      overrides = await overrideTable.getAll()
    }
  } catch {
    // optional
  }
  const overrideMap = new Map<string, any>()
  overrides.forEach(o => overrideMap.set(o.source_id, o))

  // Sorting buckets structure
  interface BucketItem { id: string, weight: number, name: string }
  const bucketMore: BucketItem[] = []
  const bucketNews: BucketItem[] = []
  const bucketHottest: BucketItem[] = []
  const bucketRealtime: BucketItem[] = []

  // Metadata payload
  const meta: Record<string, any> = {}

  // Process static sources
  typeSafeObjectEntries(sources).forEach(([idStr, s]) => {
    const id = idStr as string
    const ov = overrideMap.get(id)
    if (ov?.is_hidden === 1) return

    const weight = ov?.priority_weight ?? 0
    const bItem = { id, weight, name: s.name }

    bucketMore.push(bItem)

    // Build metadata mapping
    meta[id] = {
      id,
      name: s.name,
      color: s.color || "blue",
      home: s.home || "",
      title: ov?.badge_label || s.title,
      type: s.type,
      column_id: s.column,
      isDynamic: false
    }

    // Categorization Logic for Static Sources
    if (s.type === "hottest") {
      bucketHottest.push(bItem)
    } else if (s.type === "realtime") {
      bucketRealtime.push(bItem)
    } else {
      let isNews = ['world', 'china', 'tech', 'finance'].includes(s.column || 'world')
      if (ov && ov.is_mainstream_media !== undefined && ov.is_mainstream_media !== -1) {
        isNews = ov.is_mainstream_media === 1
      }
      if (isNews) bucketNews.push(bItem)
    }
  })

  // Process dynamic sources
  customSources.forEach(s => {
    const weight = s.priority_weight ?? 0
    const bItem = { id: s.id, weight, name: s.name }

    bucketMore.push(bItem)

    meta[s.id] = {
      id: s.id,
      name: s.name,
      color: s.color || "blue",
      home: s.home_url || `https://${s.subdomain}.buzzing.cc`,
      title: s.badge_label || undefined,
      type: s.type,
      column_id: s.column_id,
      subdomain: s.subdomain,
      isDynamic: true
    }

    // Categorization Logic for Dynamic Sources
    if (s.type === "hottest") {
      bucketHottest.push(bItem)
    } else if (s.type === "realtime") {
      bucketRealtime.push(bItem)
    } else {
      if (s.is_mainstream_media === 1) {
        bucketNews.push(bItem)
      }
    }
  })

  // Sort helper: Priority Weight DESC -> Name ASC -> ID ASC
  function sortBucket(bucket: BucketItem[]) {
    return bucket.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight
      if (a.name && b.name) {
        const nameCmp = a.name.localeCompare(b.name)
        if (nameCmp !== 0) return nameCmp
      }
      return a.id.localeCompare(b.id)
    }).map(x => x.id)
  }

  const categories = {
    more: sortBucket(bucketMore),
    news: sortBucket(bucketNews),
    hottest: sortBucket(bucketHottest),
    realtime: sortBucket(bucketRealtime)
  }

  // We set cache headers for performance, but shorter since custom sources update frequently
  setHeader(event, "Cache-Control", "public, max-age=60")

  return {
    categories,
    metadata: meta
  }
})
