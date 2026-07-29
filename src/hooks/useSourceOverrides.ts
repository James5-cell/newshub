import { useQuery } from "@tanstack/react-query"
import { myFetch } from "~/utils"

const LOCAL_STORAGE_CACHE_KEY = "source_overrides_cache"

export function useSourceOverrides() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["source-overrides"],
    queryFn: async () => {
      const res: { hiddenSourceIds: string[] } = await myFetch("/source-overrides")
      const ids = res?.hiddenSourceIds ?? []
      try {
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(ids))
      } catch { }
      return ids
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY)
        if (cached) {
          return JSON.parse(cached) as string[]
        }
      } catch { }
      return undefined
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 1,
  })

  return {
    hiddenSourceIds: data ?? [],
    isLoading,
    refetch,
  }
}
