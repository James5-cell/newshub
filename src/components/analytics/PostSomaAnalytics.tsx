import { useRouterState } from "@tanstack/react-router"
import {
  CROSS_DOMAIN_LIST,
  GA_COGNITIVE_LAYER,
  GA_PROJECT_ID,
  GA_PROJECT_NAME,
  GA_ROLLUP_ID,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
  isLocalHostname,
  isValidGaId,
} from "~/config/analytics"

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function PostSomaAnalytics() {
  const location = useRouterState({ select: state => state.location })
  const initializedRef = useRef(false)
  const lastTrackedPathRef = useRef<string | null>(null)
  const isProd = import.meta.env.PROD

  useEffect(() => {
    if (!isProd || typeof window === "undefined") return
    if (isLocalHostname(window.location.hostname)) return

    const hasRollup = isValidGaId(GA_ROLLUP_ID)
    const hasProject = isValidGaId(GA_PROJECT_ID) && GA_PROJECT_ID !== GA_ROLLUP_ID
    const primaryGaId = hasRollup ? GA_ROLLUP_ID : hasProject ? GA_PROJECT_ID : ""

    if (primaryGaId && !document.getElementById("postsoma-ga4-gtag")) {
      const gtagScript = document.createElement("script")
      gtagScript.id = "postsoma-ga4-gtag"
      gtagScript.async = true
      gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGaId)}`
      document.head.appendChild(gtagScript)

      window.dataLayer = window.dataLayer || []
      window.gtag = window.gtag || function (...args: unknown[]) {
        window.dataLayer?.push(args)
      }

      window.gtag("js", new Date())
      window.gtag("set", "linker", { domains: CROSS_DOMAIN_LIST })
      window.gtag("set", {
        project_name: GA_PROJECT_NAME,
        cognitive_layer: GA_COGNITIVE_LAYER,
      })

      if (hasRollup) {
        window.gtag("config", GA_ROLLUP_ID, {
          project_name: GA_PROJECT_NAME,
          cognitive_layer: GA_COGNITIVE_LAYER,
          send_page_view: false,
        })
      }

      if (hasProject) {
        window.gtag("config", GA_PROJECT_ID, {
          project_name: GA_PROJECT_NAME,
          cognitive_layer: GA_COGNITIVE_LAYER,
          send_page_view: false,
        })
      }

      initializedRef.current = true
    }

    if (
      UMAMI_WEBSITE_ID
      && UMAMI_SCRIPT_URL
      && !document.getElementById("postsoma-umami-script")
    ) {
      const umamiScript = document.createElement("script")
      umamiScript.id = "postsoma-umami-script"
      umamiScript.defer = true
      umamiScript.src = UMAMI_SCRIPT_URL
      umamiScript.setAttribute("data-website-id", UMAMI_WEBSITE_ID)
      document.head.appendChild(umamiScript)
    }
  }, [isProd])

  useEffect(() => {
    if (!isProd || typeof window === "undefined") return
    if (isLocalHostname(window.location.hostname)) return
    if (!initializedRef.current || typeof window.gtag !== "function") return

    const fullPath = `${location.pathname}${location.searchStr || ""}`
    if (lastTrackedPathRef.current === fullPath) return
    lastTrackedPathRef.current = fullPath

    window.gtag("event", "page_view", {
      page_path: fullPath,
      page_location: window.location.href,
      page_title: document.title,
      project_name: GA_PROJECT_NAME,
      cognitive_layer: GA_COGNITIVE_LAYER,
    })
  }, [location.pathname, location.searchStr, isProd])

  return null
}
