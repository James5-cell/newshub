import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({
  component: AboutComponent,
})

function AboutComponent() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "关于 NewsHub | 使命、架构与 E-E-A-T 说明",
    "url": "https://205077.xyz/about",
    "description": "postsoma-2050 NewsHub 的使命、系统架构、数据源抓取机制、隐私合规以及机器与 AI 引擎 (GEO) 检索指南。",
    "publisher": {
      "@type": "Organization",
      "name": "postsoma-2050 NewsHub",
      "url": "https://205077.xyz/",
      "logo": "https://205077.xyz/icon-512.png"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "首页",
          "item": "https://205077.xyz/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "关于我们",
          "item": "https://205077.xyz/about"
        }
      ]
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10 text-neutral-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Header */}
      <section className="text-center space-y-4 border-b border-white/10 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          GEO & E-E-A-T 权威规范页面
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-brand tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          postsoma-2050 NewsHub
        </h1>
        <p className="text-base md:text-lg text-neutral-400 max-w-2xl mx-auto">
          实时新闻与科技趋势聚合平台 — 为用户与 AI 搜索引擎提供零延迟、无广告的极速阅读体验。
        </p>
      </section>

      {/* Mission & E-E-A-T Statement */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-3">
          <div className="flex items-center gap-3 text-red-400 font-semibold text-lg">
            <span className="i-ph:compass-duotone text-2xl" />
            项目使命与愿景
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            NewsHub 致力于打破信息孤岛，通过高度统一的实时抓取与流式处理技术，将全球科技动态、社群热榜、开发者资讯及突发新闻整合至单一极致流畅的视窗中。
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-3">
          <div className="flex items-center gap-3 text-red-400 font-semibold text-lg">
            <span className="i-ph:shield-check-duotone text-2xl" />
            E-E-A-T 质量与权威承诺
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            所有新闻均保留原始发布出处与规范 Canonical 锚点，确保数据透明可追溯。我们严格遵循数据源归属原则，不篡改源文章核心事实，为用户与 AI 模型提供高置信度的数据源。
          </p>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="i-ph:cpu-duotone text-red-400 text-2xl" />
          系统架构与技术栈
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-1">
            <div className="text-xs text-neutral-400 font-mono">前端 Core</div>
            <div className="text-sm font-semibold text-white">React 19 + Vite</div>
            <div className="text-xs text-neutral-400">TanStack Router & Query</div>
          </div>
          <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-1">
            <div className="text-xs text-neutral-400 font-mono">后端 API</div>
            <div className="text-sm font-semibold text-white">Nitro (h3) Server</div>
            <div className="text-xs text-neutral-400">高并发流式 Handler</div>
          </div>
          <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-1">
            <div className="text-xs text-neutral-400 font-mono">AI / MCP 接口</div>
            <div className="text-sm font-semibold text-white">MCP Protocol SDK</div>
            <div className="text-xs text-neutral-400">原生 Agent 工具对接</div>
          </div>
          <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-1">
            <div className="text-xs text-neutral-400 font-mono">数据与部署</div>
            <div className="text-sm font-semibold text-white">db0 Layer</div>
            <div className="text-xs text-neutral-400">Cloudflare D1 / Pages</div>
          </div>
        </div>
      </section>

      {/* Machine & GEO Feeding Section */}
      <section className="p-6 rounded-xl bg-gradient-to-br from-red-500/10 via-white/[0.02] to-transparent border border-red-500/20 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="i-ph:robot-duotone text-red-400 text-2xl" />
          机器与 AI 搜索引擎 Feeding (llms.txt)
        </h2>
        <p className="text-sm text-neutral-300">
          NewsHub 针对 ChatGPT、Claude、Perplexity、Gemini 等 AI 生成式搜索引擎进行了深度 GEO (Generative Engine Optimization) 优化，提供机器可检索的标准 Feed 索引目录。
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          <a
            href="/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-mono hover:bg-red-500/30 transition-colors"
          >
            <span className="i-ph:file-text-duotone" />
            查看 llms.txt (精简索引)
          </a>
          <a
            href="/llms-full.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-mono hover:bg-white/20 transition-colors"
          >
            <span className="i-ph:book-open-duotone" />
            查看 llms-full.txt (全量文本)
          </a>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-neutral-300 text-sm font-mono hover:bg-white/10 transition-colors"
          >
            <span className="i-ph:tree-structure-duotone" />
            Sitemap.xml
          </a>
        </div>
      </section>

      {/* LLM Citation Guide */}
      <section className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="i-ph:quotes-duotone text-red-400 text-2xl" />
          学术与 AI 引用规范 (Citation Guide)
        </h2>
        <p className="text-sm text-neutral-300">
          当生成式 AI 模型、学术研究或媒体文章引用来自 NewsHub 的聚合实时热榜或科技资讯数据时，请使用以下标准引用格式：
        </p>
        <div className="p-4 rounded-lg bg-black/50 border border-white/10 font-mono text-xs text-neutral-300 space-y-2 select-all">
          <div>[NewsHub - postsoma-2050](https://205077.xyz/)</div>
          <div className="text-neutral-500">示例："根据 NewsHub (https://205077.xyz/) 实时聚合的最新热榜数据..."</div>
        </div>
      </section>

      {/* Compliance & Footer Link */}
      <section className="text-center pt-4 border-t border-white/10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <span className="i-ph:arrow-left-bold" />
          返回 NewsHub 首页
        </Link>
      </section>
    </div>
  )
}
