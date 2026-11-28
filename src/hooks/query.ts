import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
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
  const batch = useQuery({
    queryKey: ["entire", key],
    queryFn: async () => {
      for (let offset = 0; offset < items.length; offset += MAX_REFRESH_SOURCES) {
        const result = await myFetch<SourceResponse[]>("/s/entire", {
          method: "POST",
          body: { sources: items.slice(offset, offset + MAX_REFRESH_SOURCES) },
        })
        applySourceResponses(queryClient, result)
      }
      return true
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

  // Give a quick shared-cache read first chance, but keep the visible feed usable on a slow connection.
  const [timedOutKey, setTimedOutKey] = useState<string>()
  useEffect(() => {
    if (!key || batch.isFetched) return
    const timer = setTimeout(() => setTimedOutKey(key), 350)
    return () => clearTimeout(timer)
  }, [key, batch.isFetched])

  return { batchReady: batch.isFetched, waitingForBatch: !batch.isFetched && timedOutKey !== key }
}
