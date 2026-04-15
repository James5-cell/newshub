import { useQuery } from "@tanstack/react-query"
import { myFetch } from "~/utils"

export function useSourceOverrides() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["source-overrides"],
    queryFn: async () => {
      const res: { hiddenSourceIds: string[] } = await myFetch("/source-overrides")
      return res?.hiddenSourceIds ?? []
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
