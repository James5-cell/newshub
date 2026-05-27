import { fixedColumnIds, metadata } from "@shared/metadata"
import { Link } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { currentColumnIDAtom } from "~/atoms"

export function NavBar() {
  const currentId = useAtomValue(currentColumnIDAtom)
  const { loggedIn } = useLogin()
  const toaster = useToast()
  const queryClient = useQueryClient()
  const { data: statusRes } = useSourcesStatus()

  const userLimit = statusRes?.userLimit
  const now = Date.now()
  const resetAt = userLimit?.resetAt ?? 0
  const count = userLimit?.count ?? 0
  const limitReached = count >= 3 && now < resetAt

  const minutesLeft = Math.ceil((resetAt - now) / 60000)
  const refreshTooltip = limitReached
    ? `已用 3/3 次，${minutesLeft}分钟后重置`
    : `全局强制刷新所有板块 (已用 ${count}/3 次)`

  const handleGlobalRefresh = async () => {
    if (limitReached) {
      toaster(`已达到手动刷新上限，请在 ${minutesLeft} 分钟后重置。`, { type: "warning" })
      return
    }

    try {
      toaster("正在强制刷新所有板块...", { type: "info" })
      const res = await myFetch<any>("/refresh", {
        method: "POST",
        body: { source: "all" },
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

      toaster("全局刷新成功，正在重新加载数据...", { type: "success" })
      cacheSources.clear()
      await queryClient.refetchQueries()
    } catch (err: any) {
      toaster(err.message || "全局刷新失败", { type: "error" })
    }
  }

  return (
    <span className={$([
      "flex p-1 rounded-lg text-sm gap-0.5",
      "bg-white/[0.04] border border-white/[0.08]",
    ])}
    >
      {fixedColumnIds.map(columnId => (
        <Link
          key={columnId}
          to="/c/$column"
          params={{ column: columnId }}
          className={$(
            "px-3 py-1 rounded-md cursor-pointer transition-all duration-200",
            currentId === columnId
              ? "bg-white/[0.1] text-white/90 font-medium"
              : "text-white/50 hover:text-white/75 hover:bg-white/[0.05]",
          )}
        >
          {metadata[columnId].name}
        </Link>
      ))}

      {loggedIn && (
        <button
          type="button"
          onClick={handleGlobalRefresh}
          disabled={limitReached}
          title={refreshTooltip}
          className={$(
            "px-3 py-1 rounded-md cursor-pointer transition-all duration-200 flex items-center gap-1",
            limitReached
              ? "text-white/20 cursor-not-allowed hover:bg-transparent"
              : "text-white/50 hover:text-white/75 hover:bg-white/[0.05]"
          )}
        >
          <span className={$("i-ph:arrow-counter-clockwise-duotone")} />
          <span>全局刷新</span>
        </button>
      )}
    </span>
  )
}
