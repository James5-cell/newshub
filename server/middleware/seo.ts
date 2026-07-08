import { defineEventHandler } from "h3"
import template from "#nitro/index"
import { getCacheTable } from "../database/cache"
import { metadata } from "../../shared/metadata"
import { sources } from "../../shared/sources"
import type { ColumnID, NewsItem } from "../../shared/types"

// Helper: Replace Meta tag
const replaceMeta = (html: string, nameOrProperty: string, isProperty: boolean, content: string) => {
  const attrName = isProperty ? "property" : "name"
  const regex = new RegExp(`<meta\\s+${attrName}="${nameOrProperty}"\\s+content="[^"]*"\\s*\\/?>`, "i")
  const replacement = `<meta ${attrName}="${nameOrProperty}" content="${content.replace(/"/g, "&quot;")}" />`
  if (regex.test(html)) {
    return html.replace(regex, replacement)
  }
  return html.replace("</head>", `  ${replacement}\n</head>`)
}

// Helper: Replace Title
const replaceTitle = (html: string, title: string) => {
  const regex = /<title>[\s\S]*?<\/title>/i
  const replacement = `<title>${title}</title>`
  if (regex.test(html)) {
    return html.replace(regex, replacement)
  }
  return html.replace("</head>", `  ${replacement}\n</head>`)
}

// Helper: Replace JSON-LD
const replaceJsonLd = (html: string, jsonLd: any) => {
  const regex = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i
  const replacement = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`
  if (regex.test(html)) {
    return html.replace(regex, replacement)
  }
  return html.replace("</head>", `  ${replacement}\n</head>`)
}

// Helper: Parse date to timestamp
const parseTime = (val: number | string | undefined) => {
  if (!val) return 0
  if (typeof val === "number") return val
  const parsed = Date.parse(val)
  return isNaN(parsed) ? 0 : parsed
}

export default defineEventHandler(async (event) => {
  const fullPath = event.path || "/"
  let path = fullPath.split("?")[0]
  if (path !== "/" && path.endsWith("/")) {
    path = path.slice(0, -1)
  }

  // Skip API routes, static files, and asset requests (let Nitro process them normally)
  if (path.startsWith("/api") || path.includes(".") || path.includes("/assets/")) {
    return
  }

  console.log(`[SEO Middleware] Intercepting page path: ${path}`)

  // 1. Determine active channel
  let columnId: ColumnID = "hottest"
  let isChannelPage = false

  if (path === "/") {
    isChannelPage = true
  } else if (path.startsWith("/c/")) {
    columnId = path.substring(3) as ColumnID
    isChannelPage = true
  }

  // Fallback to hottest if invalid column
  if (isChannelPage && !(columnId in metadata)) {
    columnId = "hottest"
  }

  const baseUrl = "https://205077.xyz"
  const canonicalUrl = path === "/" ? `${baseUrl}/` : `${baseUrl}${path}`

  let title = "NewsHub | 最热"
  let description = "NewsHub - 实时新闻聚合阅读器，汇集全球热点新闻，提供优雅的阅读体验"
  let noscriptHtml = ""
  let jsonLd: any = null

  if (isChannelPage && metadata[columnId]) {
    const columnInfo = metadata[columnId]
    const columnName = columnInfo.name
    title = `NewsHub | ${columnName}`

    // 2. Fetch cached items
    const items: NewsItem[] = []
    try {
      const cacheTable = await getCacheTable()
      if (cacheTable && columnInfo.sources.length > 0) {
        const cachedInfos = await cacheTable.getEntire(columnInfo.sources)
        for (const cacheInfo of cachedInfos) {
          if (cacheInfo.items) {
            items.push(...cacheInfo.items)
          }
        }
        // Sort items descending by publication date
        items.sort((a, b) => parseTime(b.pubDate || b.extra?.date) - parseTime(a.pubDate || a.extra?.date))
      }
    } catch (error) {
      console.error("[SEO Middleware] Cache fetch error:", error)
    }

    const topItems = items.slice(0, 50)
    const sourceNames = columnInfo.sources
      .map(srcId => sources[srcId]?.name)
      .filter(Boolean)
      .slice(0, 8)
      .join("、")

    description = `NewsHub ${columnName}频道 - 实时新闻聚合阅读器，提供优雅的阅读体验。汇集了来自 ${sourceNames || "多个主流新闻平台"} 的最新热点资讯。`

    // 3. Construct JSON-LD
    if (columnId === "hottest") {
      jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${baseUrl}/#website`,
            "name": "NewsHub",
            "url": baseUrl,
            "description": "实时新闻聚合阅读器，汇集全球热点新闻，提供优雅的阅读体验"
          },
          {
            "@type": "ItemList",
            "@id": `${baseUrl}/#itemlist`,
            "name": `NewsHub - 最热新闻列表`,
            "url": baseUrl,
            "numberOfItems": topItems.length,
            "itemListElement": topItems.map((item, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "url": item.url,
              "name": item.title
            }))
          }
        ]
      }
    } else {
      jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            "@id": `${canonicalUrl}#webpage`,
            "url": canonicalUrl,
            "name": title,
            "description": description
          },
          {
            "@type": "ItemList",
            "@id": `${canonicalUrl}#itemlist`,
            "name": `NewsHub - ${columnName}新闻列表`,
            "url": canonicalUrl,
            "numberOfItems": topItems.length,
            "itemListElement": topItems.map((item, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "url": item.url,
              "name": item.title
            }))
          }
        ]
      }
    }

    // 4. Construct noscript semantic HTML feed list
    noscriptHtml = `
  <noscript>
    <div style="padding: 20px; max-width: 800px; margin: 0 auto; font-family: sans-serif;">
      <h1>NewsHub | ${columnName}</h1>
      <p>${description}</p>
      <hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;" />
      <h2>最新资讯</h2>
      <ol style="line-height: 1.8;">
        ${topItems.map(item => `
          <li style="margin-bottom: 12px;">
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color: #F14D42; text-decoration: none; font-weight: bold;">${item.title}</a>
            ${item.pubDate || item.extra?.date ? `<span style="color: #888; font-size: 0.85em; margin-left: 10px;">(${new Date(parseTime(item.pubDate || item.extra?.date)).toLocaleString("zh-CN")})</span>` : ""}
          </li>
        `).join("")}
      </ol>
    </div>
  </noscript>
  `
  } else {
    // Non-channel route fallback (e.g. /admin, /login, etc.)
    title = `NewsHub`
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "NewsHub",
      "url": baseUrl,
      "description": description
    }
  }

  // 5. Update HTML with SEO tags
  let html = template
  html = replaceTitle(html, title)
  html = replaceMeta(html, "description", false, description)
  html = replaceMeta(html, "og:title", true, title)
  html = replaceMeta(html, "og:description", true, description)
  html = replaceMeta(html, "og:url", true, canonicalUrl)
  html = replaceMeta(html, "twitter:title", false, title)
  html = replaceMeta(html, "twitter:description", false, description)

  // Inject Canonical Link if not present
  if (!html.includes('rel="canonical"')) {
    html = html.replace("</head>", `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`)
  }

  // Replace JSON-LD
  html = replaceJsonLd(html, jsonLd)

  // Inject noscript block in body
  if (noscriptHtml) {
    html = html.replace("<body>", `<body>\n${noscriptHtml}`)
  }

  console.log(`[SEO Middleware] Served path: ${path}`)
  return html
})
