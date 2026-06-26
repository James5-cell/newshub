import { Link } from "@tanstack/react-router"
import { NavBar } from "../navbar"
import { Menu } from "./menu"
import { goToTopAtom } from "~/atoms"

function GoTop() {
  const { ok, fn: goToTop } = useAtomValue(goToTopAtom)
  return (
    <button
      type="button"
      title="Go To Top"
      className={$("i-ph:arrow-fat-up-duotone", ok ? "op-50 btn" : "op-0")}
      onClick={goToTop}
    />
  )
}


function Search() {
  const { toggle } = useSearchBar()
  return (
    <button
      type="button"
      title="Search (⌘K)"
      className={$("i-ph:magnifying-glass-duotone btn")}
      onClick={() => toggle()}
    />
  )
}

export function Header() {
  const currentId = useAtomValue(currentColumnIDAtom)
  return (
    <>
      <span className="flex justify-self-start">
        <Link to="/" className="flex gap-2 items-center">
          <svg viewBox="0 0 512 512" className="w-9 h-9 flex-shrink-0" aria-label="logo">
            <defs>
              <linearGradient id="navLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3B30" />
                <stop offset="100%" stopColor="#E53935" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill="url(#navLogoGrad)" />
            <g fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round">
              <path d="M 145 190 A 155 155 0 0 1 367 190" />
              <path d="M 182 216 A 110 110 0 0 1 330 216" />
              <path d="M 218 242 A 65 65 0 0 1 294 242" />
            </g>
            <g fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 256 260 L 180 420" />
              <path d="M 256 260 L 332 420" />
              <path d="M 218 340 L 294 340" />
              <path d="M 197 385 L 315 385" />
            </g>
            <circle cx="256" cy="250" r="18" fill="#FFFFFF" />
            <polygon points="268,295 240,350 262,350 248,405 282,342 260,342" fill="#FFFFFF" />
          </svg>
          <span className="text-2xl font-brand line-height-none!">
            <p>News</p>
            <p className="mt--1">
              <span className="color-primary-6">H</span>
              <span>ub</span>
            </p>
          </span>
        </Link>
      </span>
      <span className="justify-self-center">
        <span className="hidden md:(inline-block)">
          <NavBar />
        </span>
      </span>
      <span className="justify-self-end flex gap-4 items-center">
        <div className="hidden md:flex items-center gap-3 text-sm font-medium mr-2">
          <Link
            to="/c/$column"
            params={{ column: "focus" }}
            className={$(
              "transition-colors",
              currentId === "focus"
                ? "text-white/90 font-medium"
                : "text-white/40 hover:text-white/70"
            )}
          >
            关注
          </Link>
          <div className="w-[1px] h-3.5 bg-white/10" />
          <Link
            to="/c/$column"
            params={{ column: "more" }}
            className={$(
              "transition-colors",
              currentId === "more"
                ? "text-white/90 font-medium"
                : "text-white/40 hover:text-white/70"
            )}
          >
            来源
          </Link>
        </div>

        <div className="flex gap-2 items-center text-lg op-60">
          <Search />
          <GoTop />
          <Menu />
        </div>
      </span>
    </>
  )
}
