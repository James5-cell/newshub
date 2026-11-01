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

      <section className="space-y-4 border-b border-white/10 pb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">关于 NewsHub</h1>
        <p className="text-base text-neutral-300 max-w-2xl leading-relaxed">
          NewsHub 聚合新闻、科技资讯和社群热榜，帮助你发现内容并前往原始出处阅读。
        </p>
      </section>

      <section className="space-y-8 max-w-3xl">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">内容从哪里来</h2>
          <p className="text-sm text-neutral-300 leading-7">
            NewsHub 从不同来源自动抓取和索引内容，集中展示标题与更新信息。每条新闻都保留原始出处；点击标题即可访问来源网站。
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">阅读与工具</h2>
          <p className="text-sm text-neutral-300 leading-7">
            你可以浏览新闻、热榜和实时内容，关注常看的来源，或搜索来源与文章。Selah 阅读工具提供暂存、翻译、听读等辅助功能。
          </p>
          <Link to="/selah" className="inline-flex items-center gap-2 text-sm text-red-300 hover:text-red-200 underline underline-offset-4">
            了解 Selah 阅读工具 <span className="i-ph:arrow-right" aria-hidden="true" />
          </Link>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">技术与数据</h2>
          <p className="text-sm text-neutral-300 leading-7">
            前端使用 React、Vite 和 TanStack Router &amp; Query；服务端使用 Nitro (h3)、db0 数据层，并提供 MCP 接口。项目支持 Cloudflare D1 和 Pages 部署。
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 pt-8 space-y-4 max-w-3xl">
        <h2 className="text-xl font-semibold text-white">索引与引用</h2>
        <p className="text-sm text-neutral-300 leading-7">
          以下文件提供站点索引和机器可读的项目说明。引用 NewsHub 聚合信息时，请同时查阅并注明原始发布来源。
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:text-red-200 underline underline-offset-4">llms.txt</a>
          <a href="/llms-full.txt" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:text-red-200 underline underline-offset-4">llms-full.txt</a>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:text-red-200 underline underline-offset-4">网站地图</a>
        </div>
        <p className="text-sm text-neutral-400 leading-relaxed">引用示例：NewsHub — postsoma-2050，https://205077.xyz/</p>
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
