import { useQuery } from "@tanstack/react-query"
import { safeStorage } from "@shared/storage"

const enableLoginAtom = atom({ enable: false, url: "/api/login" })
enableLoginAtom.onMount = (set) => {
  myFetch<{ enable: boolean, url: string }>("/enable-login").then(set).catch(() => {
    set({ enable: false, url: "/api/login" })
  })
}

export function useLogin() {
  const enableLogin = useAtomValue(enableLoginAtom)
  const jwt = safeParseString(safeStorage.getItem("jwt"))
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => myFetch<{ id: string, name?: string, avatar?: string }>("/me", {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    }),
    enabled: enableLogin.enable,
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
    loggedIn: !!session.data?.id,
    userInfo: { name: session.data?.name, avatar: session.data?.avatar },
    enableLogin: enableLogin.enable,
    logout,
    login,
  }
}
