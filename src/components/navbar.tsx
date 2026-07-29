import { metadata } from "@shared/metadata"
import { Link } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { currentColumnIDAtom, currentSourcesAtom } from "~/atoms"

export function NavBar() {
  const currentId = useAtomValue(currentColumnIDAtom)
  const currentSources = useAtomValue(currentSourcesAtom)
  const { loggedIn } = useLogin()
  const toaster = useToast()
  const queryClient = useQueryClient()
  const { data: statusRes } = useSourcesStatus()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const userLimit = statusRes?.userLimit
  const now = Date.now()
  const resetAt = userLimit?.resetAt ?? 0
  const count = userLimit?.count ?? 0
  const limitReached = loggedIn && count >= 3 && now < resetAt

  const minutesLeft = Math.ceil((resetAt - now) / 60000)
  const refreshTooltip = loggedIn
    ? (limitReached
        ? `已用 3/3 次，${minutesLeft}分钟后重置`
        : `强制刷新当前所有板块 (已用 ${count}/3 次)`)
    : "刷新当前所有板块数据"

  const handleGlobalRefresh = async () => {
    if (limitReached) {
      toaster(`已达到手动刷新上限，请在 ${minutesLeft} 分钟后重置。`, { type: "warning" })
      return
    }

    try {
      setIsRefreshing(true)
      toaster("正在刷新所有板块数据...", { type: "info" })

      if (loggedIn) {
        const res = await myFetch<any>("/refresh", {
          method: "POST",
          body: { sources: currentSources },
          headers: {
            Authorization: `Bearer ${safeParseString(localStorage.getItem("jwt"))}`
          }
        })
        
        if (res?.rateLimit) {
          queryClient.setQueryData(["sources-status", loggedIn], (old: any) => {
            if (!old) return old
            return { ...old, userLimit: res.rateLimit }
          })
        }
      }
      
      // Clear client-side cache for current sources
      currentSources.forEach(id => cacheSources.delete(id))
      
      // Refetch queries related to current visible sources and columns
      await queryClient.refetchQueries({
        predicate: (query) => {
          const [type, id] = query.queryKey as ["source" | "entire", any]
          if (type === "source") {
            return currentSources.includes(id)
          }
          if (type === "entire") {
            return true
          }
          return false
        }
      })

      toaster("数据刷新完成！", { type: "success" })
    } catch (err: any) {
      toaster(err.message || "刷新失败", { type: "error" })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Primary Column Navigation Pills */}
      <nav
        className={$([
          "flex p-1 rounded-xl text-sm gap-1",
          "bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-sm",
        ])}
        aria-label="分类导航"
      >
        {(["news", "hottest", "realtime"] as const).map(columnId => (
          <Link
            key={columnId}
            to="/c/$column"
            params={{ column: columnId }}
            className={$(
              "px-3.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium",
              currentId === columnId
                ? "bg-white/12 text-white shadow-sm ring-1 ring-white/10"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
            )}
          >
            {metadata[columnId].name}
          </Link>
        ))}
      </nav>

      {/* Standalone Action Control: Refresh Button (Always visible to all users) */}
      <button
        type="button"
        onClick={handleGlobalRefresh}
        disabled={limitReached || isRefreshing}
        title={refreshTooltip}
        className={$(
          "h-[38px] px-3 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-medium border backdrop-blur-md",
          limitReached
            ? "bg-white/[0.02] border-white/[0.04] text-white/20 cursor-not-allowed"
            : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/15 active:scale-95 cursor-pointer shadow-sm"
        )}
      >
        <span
          className={$(
            "i-ph:arrow-counter-clockwise-duotone text-base",
            isRefreshing && "animate-spin text-red-400"
          )}
        />
        <span className="hidden sm:inline">刷新</span>
      </button>
    </div>
  )
}
