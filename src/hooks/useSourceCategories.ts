import { safeStorage } from "@shared/storage"
import { useQuery } from "@tanstack/react-query"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { focusSourcesAtom } from "~/atoms"
import { myFetch } from "~/utils"
import { primitiveMetadataAtom } from "~/atoms/primitiveMetadataAtom"

export interface SourceCategoryMetadata {
  id: string
  name: string
  color: string
  home: string
  title?: string
  type?: string
  subdomain?: string
  provider?: string
  isDynamic: boolean
  column_id?: string
}

export interface SourceCategoriesData {
  categories: {
    more: string[]
    news: string[]
    hottest: string[]
    realtime: string[]
  }
  metadata: Record<string, SourceCategoryMetadata>
}

const LOCAL_STORAGE_CACHE_KEY = "source_categories_cache"

export function useSourceCategories() {
  const { data, isLoading, isError: isQueryError, dataUpdatedAt, isFetching, refetch } = useQuery({
    queryKey: ["source-categories"],
    queryFn: async () => {
      const res: SourceCategoriesData = await myFetch("/source-categories")
      if (res?.categories) {
        try {
          safeStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(res))
        } catch { }
      }
      return res
    },
    initialData: () => {
      try {
        const cached = safeStorage.getItem(LOCAL_STORAGE_CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as SourceCategoriesData
          if (parsed?.categories) {
            return parsed
          }
        }
      } catch { }
      return undefined
    },
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
    retry: 1, // Only retry once to fallback quickly
  })

  return {
    data,
    isLoading,
    isError: !!isQueryError,
    refetch,
    confirmed: dataUpdatedAt > 0 && !isFetching && !isQueryError,
  }
}

export function useReconcileFocus() {
  const { data, confirmed } = useSourceCategories()
  const focus = useAtomValue(focusSourcesAtom)
  const setMetadata = useSetAtom(primitiveMetadataAtom)
  useEffect(() => {
    if (!confirmed || !data?.categories?.more || !focus.length) return
    const valid = new Set(data.categories.more)
    if (focus.every(id => valid.has(id))) return
    setMetadata(prev => {
      const remaining = prev.data.focus.filter(id => valid.has(id))
      if (remaining.length === prev.data.focus.length) return prev
      return {
        ...prev,
        updatedTime: Math.max(Date.now(), prev.updatedTime + 1),
        action: "sync",
        data: { ...prev.data, focus: remaining },
      }
    })
  }, [data, confirmed, focus, setMetadata])
}
