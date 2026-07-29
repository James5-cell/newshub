import { Link } from "@tanstack/react-router"

export function Footer() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center text-xs text-neutral-400 font-mono">
      {/* Eye-catching Selah System Pill Callout */}
      <div className="my-1">
        <Link
          to="/selah"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-white transition-all group shadow-sm cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="i-ph:circles-three-plus-duotone text-sm text-red-400" />
          <span className="font-sans font-medium text-xs">探索 Selah 阅读系统 (Reader / Translate / Pace / Listen)</span>
          <span className="i-ph:arrow-right-bold text-[10px] group-hover:translate-x-0.5 transition-transform text-neutral-400 group-hover:text-white" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-neutral-500">
        <Link to="/about" className="hover:text-neutral-200 transition-colors">
          关于 & E-E-A-T
        </Link>
        <span className="text-neutral-700">•</span>
        <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-200 transition-colors">
          llms.txt (GEO)
        </a>
        <span className="text-neutral-700">•</span>
        <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-200 transition-colors">
          Sitemap
        </a>
      </div>
      <div>
        <span>NewsHub © 2026 By </span>
        <a
          href="https://postsoma-2050.website/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-300 hover:text-white transition-colors underline underline-offset-2"
        >
          postsoma-2050
        </a>
      </div>
    </div>
  )
}
