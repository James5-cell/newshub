import { motion } from "framer-motion"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

export function Menu() {
  const { loggedIn, login, logout, userInfo, enableLogin } = useLogin()
  const [shown, show] = useState(false)
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
              "w-52 rounded-lg overflow-hidden",
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

            {/* Divider */}
            <div className="border-t border-white/[0.06] mx-2" />

            {/* Section: External links */}
            <div className="p-1.5">
              <a
                href="https://postsoma-2050.website/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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
  const jwt = safeParseString(localStorage.getItem("jwt"))
  const { data } = useQuery({
    queryKey: ["admin-check"],
    queryFn: async () => {
      const res: { isAdmin: boolean } = await myFetch("/admin/check", {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      })
      return res
    },
    enabled: loggedIn && !!jwt,
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
