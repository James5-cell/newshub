import process from "node:process"
import * as cheerio from "cheerio"
import { fetchFeed } from "#/utils/feed-fetch"
import { validateFeedURL } from "#/utils/feed-url"

function assertAdmin(event: any) {
  const adminId = process.env.ADMIN_GITHUB_ID
  if (!adminId) {
    throw createError({ statusCode: 503, message: "ADMIN_GITHUB_ID not configured" })
  }
  if (!event.context.user?.id || String(event.context.user.id) !== String(adminId)) {
    throw createError({ statusCode: 403, message: "Forbidden: Admin access only" })
  }
}

export default defineEventHandler(async (event) => {
  assertAdmin(event)

  const body = await readBody<{ url: string }>(event).catch(() => null)
  let rawUrl = body?.url?.trim()

  if (!rawUrl) {
    throw createError({ statusCode: 400, message: "url parameter is required" })
  }

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `https://${rawUrl}`
  }

  let targetUrl: string
  try { targetUrl = validateFeedURL(rawUrl) } catch { throw createError({ statusCode: 400, message: "Invalid public feed URL" }) }

  try {
    // Validate targetUrl format
    const parsedUrl = new URL(targetUrl)
    
    // Check if it is an RSSHub URL or direct feed format
    const isRssHub = parsedUrl.hostname.includes("rsshub")
    
    // Clean URL for extension matching (strip query and hash)
    const cleanUrl = targetUrl.split("?")[0].split("#")[0]
    const isDirectFeedUrl = cleanUrl.endsWith(".xml") || cleanUrl.endsWith(".rss") || cleanUrl.endsWith(".atom") || cleanUrl.endsWith("/feed") || cleanUrl.endsWith("/rss")
    
    let response: any
    let fetchError: any = null
    try {
      response = await fetchFeed(targetUrl)
    } catch (err: any) {
      fetchError = err
    }

    if (fetchError) {
      if (isRssHub || isDirectFeedUrl) {
        return {
          title: isRssHub ? "RSSHub 訂閱源" : "直接訂閱源",
          feeds: [{
            title: isRssHub ? "RSSHub 訂閱源" : "直接訂閱源",
            url: targetUrl,
            type: isRssHub ? "rsshub" : "direct",
            note: isRssHub 
              ? `獲取失敗 (${fetchError.statusCode || fetchError.message})。rsshub.app 公共實例有嚴格的爬蟲限制，建議在「提供商」中選擇 RSSHub 後直接新增。`
              : `獲取失敗 (${fetchError.statusCode || fetchError.message})，但格式為訂閱源，可直接新增。`
          }]
        }
      }
      
      throw createError({
        statusCode: fetchError.statusCode || 500,
        message: `請求目標 URL 失敗: ${fetchError.message || String(fetchError)}`
      })
    }

    // If the response is XML/JSON directly, check if it's already a feed
    if (typeof response === "string") {
      const trimmed = response.trim()
      if (
        trimmed.startsWith("<?xml") || 
        trimmed.startsWith("<rss") || 
        trimmed.includes("<feed") || 
        trimmed.includes("<channel") ||
        trimmed.startsWith("{") || 
        trimmed.startsWith("[")
      ) {
        return {
          title: isRssHub ? "RSSHub 訂閱源" : "直接訂閱源",
          feeds: [{ title: isRssHub ? "RSSHub 訂閱源" : "直接訂閱源", url: targetUrl, type: isRssHub ? "rsshub" : "direct" }]
        }
      }
    }

    // Try loading with Cheerio to search alternate link tags
    const html = typeof response === "string" ? response : String(response)
    const $ = cheerio.load(html)
    const feeds: { title: string; url: string; type: string }[] = []

    // Search alternate feed links
    $('link[rel="alternate"]').each((_, el) => {
      const type = $(el).attr("type") || ""
      const href = $(el).attr("href")
      if (href && (type.includes("rss") || type.includes("atom") || type.includes("json") || type.includes("xml"))) {
        try {
          const resolvedUrl = new URL(href, targetUrl).toString()
          const title = $(el).attr("title") || $(el).attr("type") || "Feed"
          feeds.push({ title, url: resolvedUrl, type })
        } catch {
          // ignore invalid URLs
        }
      }
    })

    // Fallback: search standard anchor tags pointing to common feed paths if no alternates
    if (feeds.length === 0) {
      $("a").each((_, el) => {
        const href = $(el).attr("href")
        const text = $(el).text() || ""
        if (href && (href.endsWith("/feed") || href.endsWith("/rss") || href.endsWith(".xml") || href.includes("rss") || text.toLowerCase().includes("rss"))) {
          try {
            const resolvedUrl = new URL(href, targetUrl).toString()
            feeds.push({ title: text.trim() || "Feed Link", url: resolvedUrl, type: "anchor" })
          } catch {
            // ignore
          }
        }
      })
    }

    // Deduplicate feeds by URL
    const seen = new Set<string>()
    const uniqueFeeds = feeds.filter(f => {
      if (seen.has(f.url)) return false
      seen.add(f.url)
      return true
    })

    // Get site title
    const siteTitle = $("title").text().trim() || parsedUrl.hostname

    return {
      title: siteTitle,
      feeds: uniqueFeeds
    }
  } catch (err: any) {
    logger.error(`Failed to discover feeds for url: ${targetUrl}`, err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || `Failed to discover feeds: ${String(err)}`
    })
  }
})
