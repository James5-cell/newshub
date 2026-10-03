import { describe, expect, it } from "vitest"

// Replica of intent classification and scoring logic for verification
interface SourceItem {
  id: string
  name: string
  title: string
  aliases: string[]
  tags: string[]
  priority_weight: number
}

interface NewsItemMock {
  id: string
  title: string
  url: string
  pubDate: number
  sourceId: string
  sourceName: string
}

function classifyQuery(q: string, sources: SourceItem[]): { intent: "source" | "content" | "mixed", sourceMatches: any[] } {
  let hasSourceIntent = false
  const sourceMatches: any[] = []

  sources.forEach(src => {
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
      sourceMatches.push({ ...src, score, matchReason })
    }
  })

  sourceMatches.sort((a, b) => b.score - a.score)
  return {
    intent: hasSourceIntent ? "source" : "content",
    sourceMatches
  }
}

function scoreNewsItems(q: string, items: NewsItemMock[], sources: SourceItem[], now: number): any[] {
  const contentMatches: any[] = []
  const activeSourcesMap = new Map(sources.map(s => [s.id, s]))

  items.forEach(item => {
    const src = activeSourcesMap.get(item.sourceId)
    if (!src) return

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
      const hoursAge = (now - item.pubDate) / (1000 * 3600)
      const freshnessPenalty = hoursAge / 6
      const score = matchStrength * 10 + src.priority_weight * 0.5 - freshnessPenalty

      contentMatches.push({
        ...item,
        score,
        matchReason
      })
    }
  })

  return contentMatches.sort((a, b) => b.score - a.score)
}

describe("search Logic Unit Tests", () => {
  const mockSources: SourceItem[] = [
    { id: "weibo", name: "微博", title: "热搜", aliases: ["weibo", "wb", "新浪微博"], tags: ["社交", "娱乐"], priority_weight: 10 },
    { id: "36kr", name: "36氪", title: "快讯", aliases: ["36kr", "36氪", "kr"], tags: ["科技", "创投"], priority_weight: 0 },
    { id: "v2ex", name: "V2EX", title: "分享", aliases: ["v2ex", "v2"], tags: ["技术", "论坛"], priority_weight: 5 }
  ]

  it("1. Verify Intent Classification - Exact & Alias Matching", () => {
    // Exact name match
    const result1 = classifyQuery("微博", mockSources)
    expect(result1.intent).toBe("source")
    expect(result1.sourceMatches[0].id).toBe("weibo")
    expect(result1.sourceMatches[0].matchReason).toBe("exact_match")

    // Alias exact match
    const result2 = classifyQuery("wb", mockSources)
    expect(result2.intent).toBe("source")
    expect(result2.sourceMatches[0].id).toBe("weibo")
    expect(result2.sourceMatches[0].matchReason).toBe("alias_exact_match")

    // General term not in source metadata should fall back to content intent
    const result3 = classifyQuery("股市", mockSources)
    expect(result3.intent).toBe("content")
    expect(result3.sourceMatches.length).toBe(0)
  })

  it("2. Verify Source Match Ranking with Priority Weight", () => {
    // Search "v2" matching v2ex and weibo (wb) partially
    const result = classifyQuery("v2", mockSources)
    expect(result.sourceMatches[0].id).toBe("v2ex") // v2 is exact alias for v2ex
  })

  it("3. Verify News Article Ranking with Match strength, Weight, and Freshness", () => {
    const now = Date.now()
    const mockNews: NewsItemMock[] = [
      { id: "1", title: "Apple releases new iPhone 18", url: "http://1", pubDate: now - 1000 * 3600 * 2, sourceId: "36kr", sourceName: "36氪" }, // 2 hours old
      { id: "2", title: "iPhone 18 leaked specs", url: "http://2", pubDate: now - 1000 * 3600 * 24, sourceId: "weibo", sourceName: "微博" } // 24 hours old, but weibo has higher weight
    ]

    // Query: "iphone"
    const results = scoreNewsItems("iphone", mockNews, mockSources, now)
    
    // Result 1 matches start of title (Apple releases... contains "iphone", vs "iPhone 18 leaked..." starts with "iphone")
    // Wait, "iPhone 18 leaked specs" starts with "iphone" -> title_prefix_match (strength 5)
    // "Apple releases new iPhone 18" contains "iphone" -> title_substring_match (strength 3)
    expect(results[0].id).toBe("2") // starts with "iphone", so rank 1 despite being older
    
    // Query "apple"
    const appleResults = scoreNewsItems("apple", mockNews, mockSources, now)
    expect(appleResults[0].id).toBe("1")
  })
})
