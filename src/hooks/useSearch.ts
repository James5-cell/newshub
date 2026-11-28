import { useLocation, useRouter } from "@tanstack/react-router"

declare module "@tanstack/react-router" {
  interface HistoryState {
    newsSearchOpen?: boolean
    newsSearchSession?: string
  }
}

const searchSessionId = Math.random().toString(36).slice(2)

export function useSearchBar() {
  const { history } = useRouter()
  const opened = useLocation({ select: location => !!location.state.newsSearchOpen })
  const toggle = useCallback((status?: boolean) => {
    const { href, state } = history.location
    const current = !!state.newsSearchOpen
    if ((status ?? !current) === current) return
    if (current) {
      if (state.newsSearchSession === searchSessionId) history.back()
      else history.replace(href, { ...state, newsSearchOpen: undefined, newsSearchSession: undefined })
    } else {
      history.push(href, { ...state, newsSearchOpen: true, newsSearchSession: searchSessionId })
    }
  }, [history])
  return { opened, toggle }
}
