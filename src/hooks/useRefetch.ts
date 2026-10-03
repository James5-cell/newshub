import { useQueryClient } from "@tanstack/react-query"
import { atom, useAtom } from "jotai"
import { useCallback, useEffect, useState } from "react"
import type { RefreshResponse, SourceID } from "@shared/types"
import { MAX_REFRESH_SOURCES } from "@shared/refresh-policy"
import { myFetch } from "~/utils"
import { applySourceResponses } from "~/utils/refresh"
import { cacheSources } from "~/utils/data"

const refreshStateAtom = atom<{ pending: boolean, rateLimit?: RefreshResponse["rateLimit"] }>({ pending: false })
let pendingRefresh: Promise<RefreshResponse> | undefined

export function useRefetch() {
  const queryClient = useQueryClient()
  const [state, setState] = useAtom(refreshStateAtom)
  const [now, setNow] = useState(Date.now)
  const resetAt = state.rateLimit?.resetAt ?? 0
  const limitReached = !!state.rateLimit && state.rateLimit.count >= state.rateLimit.limit && now < resetAt
  useEffect(() => {
    if (!resetAt) return
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, resetAt - Date.now()) + 50)
    return () => clearTimeout(timer)
  }, [resetAt])

  const refresh = useCallback(async (...sources: SourceID[]) => {
    // A single shared request prevents card and toolbar clicks racing each other.
    if (pendingRefresh) return pendingRefresh
    if (state.rateLimit && state.rateLimit.count >= state.rateLimit.limit && Date.now() < state.rateLimit.resetAt) {
      throw new Error("刷新过于频繁，请稍后重试")
    }
    const ids = [...new Set(sources)]
      .sort((a, b) => Number(cacheSources.get(a)?.updatedTime ?? 0) - Number(cacheSources.get(b)?.updatedTime ?? 0))
      .slice(0, MAX_REFRESH_SOURCES)
    if (!ids.length) throw new Error("当前没有可刷新的板块")
    setState(previous => ({ ...previous, pending: true }))
    pendingRefresh = (async () => {
      try {
        const result = await myFetch<RefreshResponse>("/refresh", {
          method: "POST",
          body: { sources: ids },
          timeout: 60000,
        })
        applySourceResponses(queryClient, result.data)
        setState({ pending: false, rateLimit: result.rateLimit })
        setNow(Date.now())
        return result
      } catch (error: any) {
        const rateLimit = error?.data?.data?.rateLimit
        setState(previous => ({ pending: false, rateLimit: rateLimit ?? previous.rateLimit }))
        throw new Error(error?.data?.message || error.message || "刷新失败，请稍后重试")
      } finally {
        pendingRefresh = undefined
      }
    })()
    return pendingRefresh
  }, [queryClient, setState, state.rateLimit])

  return { refresh, isRefreshing: state.pending, limitReached, resetAt }
}

export function refreshMessage(result: RefreshResponse) {
  const { refreshed, failed, deferred } = result.summary
  const message = refreshed
    ? `已更新 ${refreshed} 个板块`
    : !result.data.length
        ? "暂未获取到内容，请稍后重试"
        : result.data.some(source => source.status === "stale")
          ? "暂未获取到新内容，继续显示上次数据"
          : "已获取共享缓存，未到更新间隔的来源无需重复抓取"
  return `${message}${failed ? `；${failed} 个来源暂未更新` : ""}${deferred ? `；${deferred} 个来源待后续分批更新` : ""}`
}
