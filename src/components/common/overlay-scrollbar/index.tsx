import type { HTMLProps, PropsWithChildren } from "react"
import { useLocation, useRouter } from "@tanstack/react-router"
import { defu } from "defu"
import { useMount } from "react-use"
import { useOverlayScrollbars } from "./useOverlayScrollbars"
import type { UseOverlayScrollbarsParams } from "./useOverlayScrollbars"
import { goToTopAtom } from "~/atoms"
import "./style.css"

type Props = HTMLProps<HTMLDivElement> & UseOverlayScrollbarsParams
const defaultScrollbarParams: UseOverlayScrollbarsParams = {
  options: {
    scrollbars: {
      autoHide: "scroll",
    },
  },
  defer: true,
}

export function OverlayScrollbar({ disabled, children, options, events, defer, className, ...props }: PropsWithChildren<Props>) {
  const ref = useRef<HTMLDivElement>(null)
  const scrollbarParams = useMemo(() => defu<UseOverlayScrollbarsParams, Array<UseOverlayScrollbarsParams> >({
    options,
    events,
    defer,
  }, defaultScrollbarParams), [options, events, defer])

  const [initialize, instance] = useOverlayScrollbars(scrollbarParams)

  useMount(() => {
    if (!disabled) {
      initialize({
        target: ref.current!,
        cancel: {
          // 如果浏览器原生滚动条是覆盖在元素上的，则取消初始化
          nativeScrollbarsOverlaid: true,
        },
      })
    }
  })

  useEffect(() => {
    if (ref.current) {
      if (instance && instance?.state().destroyed) {
        ref.current.classList.remove("scrollbar-hidden")
      } else {
        ref.current.classList.add("scrollbar-hidden")
      }
    }
  }, [instance])

  return (
    <div ref={ref} {...props} className={$("overflow-auto scrollbar-hidden", className)}>
      {/* 只能有一个 element */}
      <div>{children}</div>
    </div>
  )
}

export function GlobalOverlayScrollbar({ children, className, ...props }: PropsWithChildren<HTMLProps<HTMLDivElement>>) {
  const ref = useRef<HTMLDivElement>(null)
  const lastTrigger = useRef(0)
  const timer = useRef<any>(null)
  const setGoToTop = useSetAtom(goToTopAtom)

  const router = useRouter()
  const location = useLocation()
  const scrollCache = useRef<Map<string, number>>(new Map())
  const previousSearchOpen = useRef(!!location.state.newsSearchOpen)
  const prevPathnameRef = useRef<string>(location.pathname)

  const getHistoryKey = useCallback(() => {
    const historyLoc = (router.history as any)?.location
    return historyLoc?.state?.key || location.href
  }, [router, location.href])

  const onScroll = useCallback((e: Event) => {
    const el = e.target as HTMLElement
    if (el) {
      const key = getHistoryKey()
      scrollCache.current.set(key, el.scrollTop)
    }

    const now = Date.now()
    if (now - lastTrigger.current > 50) {
      lastTrigger.current = now
      clearTimeout(timer.current)
      timer.current = setTimeout(
        () => {
          const el = e.target as HTMLElement
          setGoToTop({
            ok: el.scrollTop > 100,
            el,
            fn: () => el.scrollTo({ top: 0, behavior: "smooth" }),
          })
        },
        500,
      )
    }
  }, [setGoToTop, getHistoryKey])

  const onScrollRef = useRef(onScroll)
  onScrollRef.current = onScroll

  const [initialize, instance] = useOverlayScrollbars({
    options: {
      scrollbars: {
        autoHide: "scroll",
      },
    },
    events: {
      scroll: (_, e) => onScrollRef.current(e),
    },
    defer: true,
  })

  useMount(() => {
    initialize({
      target: ref.current!,
      cancel: {
        nativeScrollbarsOverlaid: true,
      },
    })
    const el = ref.current
    const handleScroll = (e: Event) => onScrollRef.current(e)
    el?.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      el?.removeEventListener("scroll", handleScroll)
      clearTimeout(timer.current)
    }
  })

  useEffect(() => {
    if (ref.current) {
      if (instance && instance?.state().destroyed) {
        ref.current.classList.remove("scrollbar-hidden")
      } else {
        ref.current?.classList.add("scrollbar-hidden")
      }
    }
  }, [instance])

  // Scroll restoration & route change scroll reset for the global scroll container
  const historyStateKey = (location.state as any)?.key
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const searchOpen = !!location.state.newsSearchOpen
    const modalChanged = previousSearchOpen.current !== searchOpen
    previousSearchOpen.current = searchOpen
    if (modalChanged && prevPathnameRef.current === location.pathname) return

    const currentKey = getHistoryKey()
    const historyAction = (router.history as any)?.action
    const currentPathname = location.pathname

    if (historyAction === "POP") {
      // Restore scroll position on browser back/forward
      const savedTop = scrollCache.current.get(currentKey) ?? 0
      el.scrollTop = savedTop
    } else {
      // PUSH or REPLACE navigation
      if (prevPathnameRef.current === currentPathname) {
        // Same route navigation (e.g. clicking Overview while at bottom of /selah)
        el.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        // Navigating to a new route: instant scroll reset to top
        el.scrollTop = 0
      }
    }

    prevPathnameRef.current = currentPathname
  }, [location.href, location.pathname, location.state.newsSearchOpen, historyStateKey, router, getHistoryKey])

  return (
    <div ref={ref} {...props} className={$("overflow-auto scrollbar-hidden", className)}>
      <div>{children}</div>
    </div>
  )
}
