import { defineEventHandler, setResponseHeader } from "h3"

export default defineEventHandler((event) => {
  setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8")
  return `# robots.txt for NewsHub
# Optimized for Search Engine Optimization (SEO) & Generative Engine Optimization (GEO)

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

# Main AI & LLM Search Engine Crawlers (Explicitly Allowed for GEO)
User-agent: GPTBot
Allow: /
Disallow: /admin
Disallow: /api

User-agent: PerplexityBot
Allow: /
Disallow: /admin
Disallow: /api

User-agent: ClaudeBot
Allow: /
Disallow: /admin
Disallow: /api

User-agent: anthropic-ai
Allow: /
Disallow: /admin
Disallow: /api

User-agent: Applebot-Extended
Allow: /
Disallow: /admin
Disallow: /api

User-agent: Google-Extended
Allow: /
Disallow: /admin
Disallow: /api

User-agent: Amazonbot
Allow: /
Disallow: /admin
Disallow: /api

User-agent: Bytespider
Allow: /
Disallow: /admin
Disallow: /api

User-agent: CCBot
Allow: /
Disallow: /admin
Disallow: /api

User-agent: Diffbot
Allow: /
Disallow: /admin
Disallow: /api

User-agent: OAI-SearchBot
Allow: /
Disallow: /admin
Disallow: /api

# Hostname, Sitemap & LLM Feed Index References
Host: https://205077.xyz
Sitemap: https://205077.xyz/sitemap.xml
LLM-Text-Index: https://205077.xyz/llms.txt
`
})
