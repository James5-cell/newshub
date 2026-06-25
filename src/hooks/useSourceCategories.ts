import { useQuery } from "@tanstack/react-query"
import { useAtom } from "jotai"
import { useEffect } from "react"
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

export function useSourceCategories() {
  const { data, isLoading, isError: isQueryError } = useQuery({
    queryKey: ["source-categories"],
    queryFn: async () => {
      const res: SourceCategoriesData = await myFetch("/source-categories")
      return res
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
    retry: 1, // Only retry once to fallback quickly
  })

  // === Focus Migration 擴充部分 ===
  // 當拿回最新的 "more" (全部有效來源清單) 時，如果跟既有 focus 取交集發現失效品，就自動洗除
  const [metadata, setMetadata] = useAtom(primitiveMetadataAtom)
  useEffect(() => {
    if (data?.categories?.more && metadata.data.focus) {
      const validMoreSet = new Set(data.categories.more)
      const validFocus = metadata.data.focus.filter((id: string) => validMoreSet.has(id))
      // 如果濾完長度變短，代表有過期的來源被偷偷隱藏或刪除了
      if (validFocus.length !== metadata.data.focus.length) {
        setMetadata({
          ...metadata,
          updatedTime: Date.now(),
          action: "sync",
          data: {
            ...metadata.data,
            focus: validFocus
          }
        })
      }
    }
  }, [data?.categories?.more, metadata.data.focus, setMetadata])

  return {
    data,
    isLoading,
    isError: !!isQueryError,
  }
}

