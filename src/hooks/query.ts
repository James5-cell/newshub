import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import type { SourceID, SourceResponse } from "@shared/types"
import { sources } from "@shared/sources"
import { AUTO_REFRESH_INTERVAL, MAX_REFRESH_SOURCES } from "@shared/refresh-policy"
import { useRefetch } from "./useRefetch"
import { applySourceResponses, getMountedSources } from "~/utils/refresh"
import { myFetch } from "~/utils"

export function useEntireQuery(items: SourceID[]) {
  const queryClient = useQueryClient()
  const { refresh } = useRefetch()
  const key = [...items].sort().join(",")
  useQuery({
    queryKey: ["entire", key],
    queryFn: async () => {
      const responses: SourceResponse[] = []
      for (let offset = 0; offset < items.length; offset += MAX_REFRESH_SOURCES) {
        const result = await myFetch<SourceResponse[]>("/s/entire", {
          method: "POST",
          body: { sources: items.slice(offset, offset + MAX_REFRESH_SOURCES) },
        })
        responses.push(...result)
      }
      // Seed caches only; cards make their own first request when they enter view.
      for (const response of responses) {
        const previous = cacheSources.get(response.id)
        if (!previous || Number(response.updatedTime) > Number(previous.updatedTime)) cacheSources.set(response.id, response)
      }
      return responses
    },
    enabled: items.length > 0,
    staleTime: AUTO_REFRESH_INTERVAL,
    refetchOnWindowFocus: false,
    retry: false,
  })

  useEffect(() => {
    let lastCheck = Date.now()
    let checking = false
    const check = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine || checking) return
      if (Date.now() - lastCheck < AUTO_REFRESH_INTERVAL) return
      const mounted = getMountedSources(queryClient, key ? key.split(",") as SourceID[] : [])
      if (!mounted.length) return
      checking = true
      lastCheck = Date.now()
      try {
        // Reading another visitor's update must not consume the refresh quota.
        const ids = mounted.slice(0, MAX_REFRESH_SOURCES)
        const responses = await myFetch<SourceResponse[]>("/s/entire", {
          method: "POST", body: { sources: ids },
        })
        applySourceResponses(queryClient, responses)
        const snapshots = new Map(responses.map(response => [response.id, response]))
        const due = [...new Set(ids.map(id => sources[id]?.redirect ?? id))].filter((id) => {
          const snapshot = snapshots.get(id)
          return !snapshot || (snapshot.status === "stale" && (snapshot.nextRefreshAt ?? 0) <= Date.now())
        })
        if (due.length) await refresh(...due)
      } catch {
        // Automatic checks stay quiet; manual refresh reports failures to the user.
      } finally {
        checking = false
      }
    }
    const timer = setInterval(check, AUTO_REFRESH_INTERVAL)
    document.addEventListener("visibilitychange", check)
    window.addEventListener("focus", check)
    window.addEventListener("online", check)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", check)
      window.removeEventListener("focus", check)
      window.removeEventListener("online", check)
    }
  }, [key, queryClient, refresh])
}
