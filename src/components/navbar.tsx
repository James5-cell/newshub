import { metadata } from "@shared/metadata"
import { Link } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { refreshMessage, useRefetch } from "~/hooks/useRefetch"
import { getMountedSources } from "~/utils/refresh"
import { currentColumnIDAtom } from "~/atoms"

export function NavBar() {
  const currentId = useAtomValue(currentColumnIDAtom)
  const toaster = useToast()
  const queryClient = useQueryClient()
  const { refresh, isRefreshing, limitReached, resetAt } = useRefetch()
  const refreshTooltip = limitReached
    ? `刷新次数已达上限，${Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))}秒后重试`
    : "刷新当前已查看的板块，所有访客共享更新，无需登录"

  const handleGlobalRefresh = async () => {
    if (isRefreshing) return
    try {
      const result = await refresh(...getMountedSources(queryClient))
      toaster(refreshMessage(result), { type: result.summary.failed ? "warning" : "success" })
    } catch (error: any) {
      toaster(error.message || "刷新失败", { type: "error" })
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
        aria-label="刷新当前板块"
        aria-busy={isRefreshing}
        className={$(
          "h-11 min-w-11 px-3 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-medium border backdrop-blur-md",
          limitReached
            ? "bg-white/[0.02] border-white/[0.04] text-white/20 cursor-not-allowed"
            : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/15 active:scale-95 cursor-pointer shadow-sm",
        )}
      >
        <span
          className={$(
            "i-ph:arrow-counter-clockwise-duotone text-base",
            isRefreshing && "animate-spin text-red-400",
          )}
        />
        <span className="hidden sm:inline">刷新</span>
      </button>
    </div>
  )
}
