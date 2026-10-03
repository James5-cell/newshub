import { safeStorage } from "@shared/storage"
import { useBeforeUnload, useMount } from "react-use"

const KEY = "unload-time"
export function isPageReload() {
  const _ = safeStorage.getItem(KEY)
  if (!_) return false
  const unloadTime = Number(_)
  if (!Number.isNaN(unloadTime) && Date.now() - unloadTime < 1000) {
    return true
  }
  safeStorage.removeItem(KEY)
  return false
}

export function useOnReload(fn?: () => Promise<void> | void, fallback?: () => Promise<void> | void) {
  useBeforeUnload(() => {
    safeStorage.setItem(KEY, Date.now().toString())
    return false
  })

  useMount(() => {
    if (isPageReload()) {
      fn?.()
    } else {
      fallback?.()
    }
  })
}
