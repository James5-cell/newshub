import { useQuery } from "@tanstack/react-query"
import { myFetch, safeParseString } from "~/utils"

export interface SourceStatus {
  id: string
  last_attempt_at: number
  last_success_at: number
  status: 'success' | 'failed' | 'unknown'
  error_message: string
}

export interface UserRefreshLimit {
  count: number
  limit: number
  resetAt: number
}

export function useSourcesStatus() {
  const { loggedIn } = useLogin()
  
  return useQuery({
    queryKey: ["sources-status", loggedIn],
    queryFn: async () => {
      const jwt = safeParseString(localStorage.getItem("jwt"))
      const headers: Record<string, string> = {}
      if (jwt) {
        headers.Authorization = `Bearer ${jwt}`
      }
      const res = await myFetch<{
        status: string
        data: SourceStatus[]
        userLimit: UserRefreshLimit | null
      }>("/status", { headers })
      return res
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: false
  })
}
