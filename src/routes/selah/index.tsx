import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/selah/")({
  component: SelahHubIndex,
})

function SelahHubIndex() {
  return (
    <div className="space-y-8 py-4">
      {/* Hero Section */}
      <section className="space-y-4 text-center md:text-left border-b border-white/10 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-neutral-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Selah System · Conscious Web Reading
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-bold font-brand tracking-tight text-white leading-tight">
            Selah Reading Tools
          </h1>
          <p className="text-sm md:text-base text-neutral-400 max-w-xl leading-relaxed">
            从发现内容，到按需阅读辅助。
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
            <p className="text-xs sm:text-sm font-mono text-neutral-400">
              Selah Hold · Selah Pace
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-red-400 group-hover:text-red-300 transition-colors pt-2 border-t border-white/[0.06]">
            <span>探索</span>
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
            <p className="text-xs sm:text-sm font-mono text-neutral-400">
              Selah Reader · Selah Translate · Selah Listen · Selah PageFirst
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-red-400 group-hover:text-red-300 transition-colors pt-2 border-t border-white/[0.06]">
            <span>探索</span>
            <span className="i-ph:arrow-right-bold text-xs group-hover:translate-x-1 transition-transform motion-reduce:transition-none" aria-hidden="true" />
          </div>
        </Link>
      </section>
    </div>
  )
}
