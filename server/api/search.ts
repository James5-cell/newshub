import { sources } from "@shared/sources"
import { typeSafeObjectEntries } from "@shared/type.util"
import { staticSourceMetadata } from "@shared/source-metadata"
import type { NewsItem } from "@shared/types"
import { consumePublicLimit } from "#/utils/public-limit"
import { getCacheTable } from "#/database/cache"

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const q = (queryParams.q as string || "").trim().toLowerCase()

  if (q.length > 200) throw createError({ statusCode: 400, message: "Search query is too long" })

  if (!q) {
    return {
      intent: "mixed",
      sources: [],
      items: [],
      debug: { query: q, scannedCaches: 0, matchingArticlesCount: 0 }
    }
  }

  const quota = await consumePublicLimit(event, "search", 30)
  if (!quota.allowed) {
    setHeader(event, "Retry-After", Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 1000)))
    throw createError({ statusCode: 429, message: "Search requests are too frequent" })
  }

  // 1. Get database tables safely
  let customSources: any[] = []
  let overrides: any[] = []
  
  try {
    const { getCustomSourceTable } = await import("#/database/source-config")
    const customTable = await getCustomSourceTable()
    if (customTable) {
      customSources = await customTable.getActive()
    }
  } catch (e) {
    logger.error("Search API: custom sources fetch failed", e)
  }

  try {
    const { getOverrideTable } = await import("#/database/source-config")
    const overrideTable = await getOverrideTable()
    if (overrideTable) {
      overrides = await overrideTable.getAll()
    }
  } catch (e) {
    logger.error("Search API: overrides fetch failed", e)
  }

  const overrideMap = new Map<string, any>()
  overrides.forEach(o => overrideMap.set(o.source_id, o))

  // Build unified sources list (excluding hidden/deleted ones)
  const allSources: Array<{
    id: string
    name: string
    title: string
    column: string
    color: string
    priority_weight: number
    isDynamic: boolean
    aliases: string[]
    tags: string[]
  }> = []

  // Process static sources
  typeSafeObjectEntries(sources).forEach(([idStr, s]) => {
    const id = idStr as string
    const ov = overrideMap.get(id)
    if (ov?.is_hidden === 1 || ov?.is_deleted === 1) return

    const weight = ov?.priority_weight ?? 0
    const meta = staticSourceMetadata[id]
    
    allSources.push({
      id,
      name: s.name,
      title: ov?.badge_label || s.title || "",
      column: s.column || "world",
      color: s.color || "blue",
      priority_weight: weight,
      isDynamic: false,
      aliases: meta?.aliases || [s.name.toLowerCase()],
      tags: meta?.tags || []
    })
  })

  // Process custom sources
  customSources.forEach(s => {
    const ov = overrideMap.get(s.id)
    if (ov?.is_hidden === 1 || ov?.is_deleted === 1) return

    const weight = s.priority_weight ?? 0
    
    // Parse tags (tags is stored as JSON array string or empty string)
    let parsedTags: string[] = []
    try {
      if (s.tags) {
        parsedTags = JSON.parse(s.tags)
      }
    } catch {}

    allSources.push({
      id: s.id,
      name: s.name,
      title: s.badge_label || "",
      column: s.column_id || "world",
      color: s.color || "blue",
      priority_weight: weight,
      isDynamic: true,
      aliases: [s.name.toLowerCase(), s.id.toLowerCase()],
      tags: parsedTags
    })
  })

  // 2. Classify intent
  // If the query is an exact match or clear substring of a source name/alias, it's source intent
  let hasSourceIntent = false
  const sourceMatches: any[] = []

  allSources.forEach(src => {
    let matchStrength = 0
    let matchReason = ""

    const idLower = src.id.toLowerCase()
    const nameLower = src.name.toLowerCase()

    if (idLower === q || nameLower === q) {
      matchStrength = 10
      matchReason = "exact_match"
    } else if (src.aliases.some(a => a.toLowerCase() === q)) {
      matchStrength = 8
      matchReason = "alias_exact_match"
    } else if (nameLower.includes(q) || idLower.includes(q)) {
      matchStrength = 5
      matchReason = "substring_match"
    } else if (src.aliases.some(a => a.toLowerCase().includes(q))) {
      matchStrength = 4
      matchReason = "alias_substring_match"
    } else if (src.tags.some(t => t.toLowerCase().includes(q))) {
      matchStrength = 2
      matchReason = "tag_match"
    }

    if (matchStrength > 0) {
      hasSourceIntent = true
      const score = matchStrength * 100 + src.priority_weight
      sourceMatches.push({
        ...src,
        score,
        matchReason
      })
    }
  })

  // Sort sources by score desc
  sourceMatches.sort((a, b) => b.score - a.score)

  // 3. Content matching from SQLite Cache
  const contentMatches: any[] = []
  let scannedCaches = 0

  try {
    const cache = await getCacheTable()
    if (!cache) throw new Error("Cache database unavailable")
    const db = useDatabase()
    const rows = (await db.prepare("SELECT id, data, updated FROM cache").all()) as any
    const cacheRows = (rows?.results ?? rows ?? []) as any[]
    scannedCaches = cacheRows.length

    const activeSourcesMap = new Map(allSources.map(s => [s.id, s]))

    cacheRows.forEach((row: any) => {
      const src = activeSourcesMap.get(row.id)
      if (!src) return // Skip hidden, deleted, or unknown sources

      let items: NewsItem[] = []
      try {
        items = JSON.parse(row.data)
      } catch {}

      const now = Date.now()
      const updatedTime = row.updated

      items.forEach(item => {
        const titleLower = item.title.toLowerCase()
        let matchStrength = 0
        let matchReason = ""

        if (titleLower.startsWith(q)) {
          matchStrength = 5
          matchReason = "title_prefix_match"
        } else if (titleLower.includes(q)) {
          matchStrength = 3
          matchReason = "title_substring_match"
        }

        if (matchStrength > 0) {
          // Freshness penalty: 1 point penalty per 6 hours age
          const hoursAge = (now - updatedTime) / (1000 * 3600)
          const freshnessPenalty = hoursAge / 6
          const score = matchStrength * 10 + src.priority_weight * 0.5 - freshnessPenalty

          contentMatches.push({
            id: item.id,
            title: item.title,
            url: item.url,
            mobileUrl: item.mobileUrl,
            pubDate: item.pubDate,
            sourceId: src.id,
            sourceName: src.name,
            sourceColor: src.color,
            score,
            matchReason
          })
        }
      })
    })
  } catch (e) {
    logger.error("Search API: content search failed", e)
  }

  // Sort articles by score desc
  contentMatches.sort((a, b) => b.score - a.score)

  // Decide overall intent
  let intent: "source" | "content" | "mixed" = "mixed"
  if (hasSourceIntent && contentMatches.length === 0) {
    intent = "source"
  } else if (!hasSourceIntent && contentMatches.length > 0) {
    intent = "content"
  }

  return {
    intent,
    sources: sourceMatches.slice(0, 10).map(s => ({
      id: s.id,
      name: s.name,
      title: s.title,
      column: s.column,
      color: s.color,
      score: s.score,
      matchReason: s.matchReason
    })),
    items: contentMatches.slice(0, 20),
    debug: {
      query: q,
      scannedCaches,
      matchingArticlesCount: contentMatches.length
    }
  }
})
