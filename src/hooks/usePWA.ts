import { useCallback, useEffect, useRef } from "react"
import { useRegisterSW } from "virtual:pwa-register/react"

const UPDATE_INTERVAL = 60 * 60 * 1000
const MIN_CHECK_INTERVAL = 60 * 1000

export function usePWA() {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const lastCheckRef = useRef(0)

  const checkForUpdate = useCallback(() => {
    const registration = registrationRef.current
    if (!registration || !navigator.onLine) return
    const now = Date.now()
    if (now - lastCheckRef.current < MIN_CHECK_INTERVAL) return
    lastCheckRef.current = now
    void registration.update().catch(() => {
      // Network failures are retried the next time the app becomes active.
      lastCheckRef.current = 0
    })
  }, [])

  useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration
      checkForUpdate()
    },
  })

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate()
    }
    const timer = window.setInterval(onVisible, UPDATE_INTERVAL)
    window.addEventListener("focus", onVisible)
    window.addEventListener("online", onVisible)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", onVisible)
      window.removeEventListener("online", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [checkForUpdate])
}
