---
name: geo-seo-optimization
description: Standard operating guidelines and checklist for SEO and Generative Engine Optimization (GEO) in NewsHub.
---

# GEO & SEO Optimization Standard for NewsHub

This skill defines the technical standards, auditing procedures, and best practices for Search Engine Optimization (SEO) and Generative Engine Optimization (GEO) in NewsHub.

## 1. AI Crawler Access Control (`robots.txt`)
All major AI agent and LLM search engine crawlers MUST be explicitly configured with explicit permissions:
- `GPTBot` (OpenAI / ChatGPT)
- `PerplexityBot` (Perplexity AI)
- `ClaudeBot` & `anthropic-ai` (Anthropic)
- `Applebot-Extended` (Apple Intelligence)
- `Google-Extended` (Google Gemini)
- `Amazonbot` (Amazon AI)
- `Bytespider` (ByteDance / Doubao)
- `CCBot` (Common Crawl)
- `Diffbot` (Diffbot Knowledge Graph)

Rules:
- Allow: `/` (public news feeds, search, about page)
- Disallow: `/admin`, `/api`
- Sitemap reference: `https://205077.xyz/sitemap.xml`
- LLM Index reference: `https://205077.xyz/llms.txt`

## 2. Machine Knowledge Feeding (`llms.txt` & `llms-full.txt`)
- `public/llms.txt`: Lightweight Markdown index directing LLMs to core features, data endpoints, and documentation.
- `public/llms-full.txt`: Self-contained, full-text Markdown document providing detailed system architecture, RSS feed categories, MCP server interface details, E-E-A-T credentials, and citation formatting guidelines.

## 3. Rich JSON-LD Structured Data Guidelines
Every public page must serve valid Schema.org JSON-LD definitions:
- **Global / Root (`WebSite`, `Organization`)**:
  - `WebSite`: Must specify `name`, `url`, `description`, and `potentialAction` (`SearchAction`).
  - `Organization`: Must specify `name`, `url`, `logo`, `sameAs`, and `publishingPrinciples`.
- **WebApplication / SoftwareApplication**:
  - Defines NewsHub's technical metadata, application category (`NewsApplication`), operating system compatibility, and feature set.
- **BreadcrumbList**:
  - Provides clear navigational path hierarchy for search engine breadcrumb displays.
- **AboutPage**:
  - Applied on `/about` with explicit references to publisher, author credentials, citation standards, and data sources.

## 4. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
Checklist for all public-facing branding and content:
- Explicit mission statement explaining real-time news collection methodology.
- Clear disclosure of automated RSS source fetching, indexing, and storage mechanisms.
- Copyright, privacy, and data usage disclaimers.
- Easy access to machine feeds (`llms.txt`) and human-readable documentation (`/about`).
- Standardized citation guidelines for academic and LLM attribution.

## 5. Technical Validation Protocol
Before releasing changes:
1. Verify `sitemap.xml` URLs use absolute domain `https://205077.xyz/`.
2. Validate JSON-LD structures via Google Rich Results Test standard schemas.
3. Run project build (`npm run build`) to ensure 0 TypeScript compilation or linting errors.
