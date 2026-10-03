import { safeStorage } from "@shared/storage"
import { motion } from "framer-motion"
import { Link, useLocation } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

export function Menu() {
  const { loggedIn, login, logout, userInfo, enableLogin } = useLogin()
  const [shown, show] = useState(false)
  const { toggle: toggleSearch } = useSearchBar()
  const location = useLocation()
  const isSelah = location.pathname.startsWith("/selah")

  return (
    <span className="relative" onMouseEnter={() => show(true)} onMouseLeave={() => show(false)}>
      <span className="flex items-center scale-90">
        {
          enableLogin && loggedIn && userInfo.avatar
            ? (
                <button
                  type="button"
                  className="h-6 w-6 rounded-full bg-cover ring-1 ring-white/10 transition-all duration-200 hover:ring-white/25"
                  style={{ backgroundImage: `url(${userInfo.avatar}&s=24)` }}
                />
              )
            : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              )
        }
      </span>
      {shown && (
        <div className="absolute right-0 z-99 bg-transparent pt-3 top-4">
          <motion.div
            id="dropdown-menu"
            className={$([
              "w-56 rounded-lg overflow-hidden",
              "bg-[#1A1A1A]/95 backdrop-blur-md",
              "border border-white/[0.08]",
              "shadow-2xl shadow-black/80",
            ])}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Section: Account */}
            <div className="p-1.5">
              {enableLogin && (loggedIn
                ? (
                    <li onClick={logout}>
                      <span className="i-ph:sign-out-duotone inline-block op-50" />
                      <span>退出登录</span>
                    </li>
                  )
                : (
                    <li onClick={login}>
                      <span className="i-ph:github-logo-duotone inline-block op-50" />
                      <span>GitHub 账号登录</span>
                    </li>
                  ))}
              <AdminMenuEntry loggedIn={loggedIn} />
            </div>

            {/* Section: Mobile Navigation Links */}
            <div className="p-1.5 md:hidden border-t border-white/[0.06] pt-1.5 mt-1 space-y-0.5">
              {isSelah ? (
                <>
                  <div className="px-2 py-1 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    Selah Framework Nav
                  </div>
                  <li>
                    <Link to="/selah" className="flex items-center gap-2.5 w-full" onClick={() => show(false)}>
                      <span className="i-ph:compass-duotone inline-block text-red-400" />
                      <span>Overview</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={"/selah/extensions" as any} className="flex items-center gap-2.5 w-full" onClick={() => show(false)}>
                      <span className="i-ph:squares-four-duotone inline-block text-red-400" />
                      <span>Extensions</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={"/selah/guide" as any} className="flex items-center gap-2.5 w-full" onClick={() => show(false)}>
                      <span className="i-ph:book-open-duotone inline-block text-red-400" />
                      <span>Use Cases</span>
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      to="/c/$column"
                      params={{ column: "focus" }}
                      className="flex items-center gap-2.5 w-full"
                      onClick={() => show(false)}
                    >
                      <span className="i-ph:star-duotone inline-block op-50" />
                      <span>关注</span>
                    </Link>
                  </li>
                  <li
                    onClick={() => {
                      toggleSearch()
                      show(false)
                    }}
                  >
                    <span className="i-ph:magnifying-glass-duotone inline-block op-50" />
                    <span>搜索</span>
                  </li>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] mx-2" />

            {/* Section: External & Info links */}
            <div className="p-1.5 space-y-0.5">
              <Link
                to="/selah"
                className="flex items-center justify-between px-3 py-2 text-sm text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-all cursor-pointer font-medium"
                onClick={() => show(false)}
              >
                <div className="flex items-center gap-2">
                  <span className="i-ph:circles-three-plus-duotone text-base text-red-400" />
                  <span>Selah System</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-300">
                  套件
                </span>
              </Link>
              <Link
                to="/about"
                className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => show(false)}
              >
                <span className="i-ph:info-duotone text-base" />
                关于 & E-E-A-T
              </Link>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="i-ph:robot-duotone text-base" />
                llms.txt (GEO)
              </a>
              <a
                href="https://postsoma-2050.website/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18M3 9h6M3 15h6"/>
                </svg>
                postsoma-2050
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </span>
  )
}

function AdminMenuEntry({ loggedIn }: { loggedIn: boolean }) {
  const jwt = safeParseString(safeStorage.getItem("jwt"))
  const { data } = useQuery({
    queryKey: ["admin-check"],
    queryFn: async () => {
      const res: { isAdmin: boolean } = await myFetch("/admin/check", {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      })
      return res
    },
    enabled: loggedIn,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  if (!data?.isAdmin) return null

  return (
    <li>
      <Link to="/admin" className="flex items-center gap-2.5 w-full">
        <span className="i-ph:gear-six-duotone inline-block op-50" />
        <span>管理來源</span>
      </Link>
    </li>
  )
}
