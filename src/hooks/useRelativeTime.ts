const clockAtom = atom(Date.now())

clockAtom.onMount = (set) => {
  const tick = () => {
    if (document.visibilityState === "visible") set(Date.now())
  }
  tick()
  const timer = setInterval(tick, 60_000)
  document.addEventListener("visibilitychange", tick)
  return () => {
    clearInterval(timer)
    document.removeEventListener("visibilitychange", tick)
  }
}

export function useRelativeTime(timestamp: string | number) {
  return relativeTime(timestamp, useAtomValue(clockAtom))
}
