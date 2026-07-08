import { defineEventHandler, setResponseHeader } from "h3"
import { fixedColumnIds } from "@shared/metadata"

export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "application/xml; charset=utf-8")
  
  const baseUrl = "https://205077.xyz"
  const now = new Date().toISOString().split("T")[0] // YYYY-MM-DD
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  
  // 1. Homepage
  sitemap += `  <url>\n`
  sitemap += `    <loc>${baseUrl}/</loc>\n`
  sitemap += `    <lastmod>${now}</lastmod>\n`
  sitemap += `    <changefreq>always</changefreq>\n`
  sitemap += `    <priority>1.0</priority>\n`
  sitemap += `  </url>\n`
  
  // 2. Fixed Column Pages (focus, news, hottest, realtime, more)
  for (const id of fixedColumnIds) {
    const priority = id === "hottest" || id === "realtime" ? "0.9" : "0.8"
    const changefreq = id === "hottest" || id === "realtime" ? "always" : "hourly"
    
    sitemap += `  <url>\n`
    sitemap += `    <loc>${baseUrl}/c/${id}</loc>\n`
    sitemap += `    <lastmod>${now}</lastmod>\n`
    sitemap += `    <changefreq>${changefreq}</changefreq>\n`
    sitemap += `    <priority>${priority}</priority>\n`
    sitemap += `  </url>\n`
  }
  
  sitemap += `</urlset>\n`
  return sitemap
})
