import { Link } from "@tanstack/react-router"

export function Footer() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-neutral-400 font-mono">
      <div className="flex flex-wrap items-center justify-center gap-3">
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
