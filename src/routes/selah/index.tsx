import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/selah/")({
  component: SelahHubIndex,
})

function SelahHubIndex() {
  return (
    <div className="space-y-8 py-4">
      {/* Hero Section */}
      <section className="space-y-4 border-b border-white/10 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            让阅读更从容
          </h1>
          <p className="text-sm md:text-base text-neutral-400 max-w-xl leading-relaxed">
            暂存网页、专注阅读、翻译或听读。选择你需要的浏览器工具，按自己的方式阅读。
          </p>
        </div>
      </section>

      {/* Two Exploration Entrance Cards Only */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-label="Selah 阅读工具探索入口">
        {/* Card A */}
        <Link
          to="/selah/extensions"
          hash="utilities"
          className="p-6 sm:p-8 rounded-xl bg-white/[0.02] border border-white/10 hover:border-red-500/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between gap-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 motion-reduce:transition-none"
        >
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-red-300 transition-colors">
              内容与注意力
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">暂存网页、安排阅读时间，或整理视频内容。</p>
            <p className="text-xs sm:text-sm text-neutral-400">
              Selah Hold · Selah Pace · Selah Bridge
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-red-400 group-hover:text-red-300 transition-colors pt-2 border-t border-white/[0.06]">
            <span>查看内容与注意力工具</span>
            <span className="i-ph:arrow-right-bold text-xs group-hover:translate-x-1 transition-transform motion-reduce:transition-none" aria-hidden="true" />
          </div>
        </Link>

        {/* Card B */}
        <Link
          to="/selah/extensions"
          hash="in-reading"
          className="p-6 sm:p-8 rounded-xl bg-white/[0.02] border border-white/10 hover:border-red-500/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between gap-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 motion-reduce:transition-none"
        >
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-red-300 transition-colors">
              阅读中的即时工具
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">清理页面、翻译文字、听读或提问。</p>
            <p className="text-xs sm:text-sm text-neutral-400">
              Selah Reader · Selah Translate · Selah Listen · Selah PageFirst
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-red-400 group-hover:text-red-300 transition-colors pt-2 border-t border-white/[0.06]">
            <span>查看阅读工具</span>
            <span className="i-ph:arrow-right-bold text-xs group-hover:translate-x-1 transition-transform motion-reduce:transition-none" aria-hidden="true" />
          </div>
        </Link>
      </section>
      <p className="text-sm text-neutral-400">不确定从哪里开始？<Link to="/selah/guide" className="text-red-300 hover:text-red-200 underline underline-offset-4">按遇到的问题查找工具</Link></p>
    </div>
  )
}
