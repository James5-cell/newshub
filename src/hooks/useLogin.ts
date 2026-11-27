import { useQuery } from "@tanstack/react-query"
import type { FetchError } from "ofetch"
import { safeStorage } from "@shared/storage"

export function useLogin() {
  const availability = useQuery({
    queryKey: ["enable-login"],
    queryFn: () => myFetch<{ enable: boolean }>("/enable-login"),
    staleTime: Infinity,
    retry: false,
  })
  const enabled = availability.data?.enable === true
  const jwt = safeParseString(safeStorage.getItem("jwt"))
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => myFetch<{ id: string, name?: string, avatar?: string }>("/me", {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    }),
    enabled,
    retry: false,
    staleTime: 60_000,
  })
  const login = useCallback(() => {
    window.location.href = "/api/login"
  }, [])
  const logout = useCallback(async () => {
    try {
      await myFetch("/me/logout", { method: "POST", headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} })
    } finally {
      ["jwt", "user", "login"].forEach(key => safeStorage.removeItem(key))
      window.location.reload()
    }
  }, [jwt])
  return {
    accountId: session.data?.id,
    loggedIn: !!session.data?.id,
    userInfo: { name: session.data?.name, avatar: session.data?.avatar },
    enableLogin: enabled,
    checkingLogin: availability.isPending || (enabled && session.isPending),
    loginCheckFailed: availability.isError || (enabled && session.isError && (session.error as FetchError).statusCode !== 401),
    retryLoginCheck: availability.isError ? availability.refetch : session.refetch,
    logout,
    login,
  }
}
