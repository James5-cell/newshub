// All readers share these source cooldowns, regardless of login state.
export const MIN_SOURCE_INTERVAL = 5 * 60 * 1000
export const AUTO_REFRESH_INTERVAL = 60 * 1000
export const REFRESH_BATCH_SIZE = 3
export const MAX_REFRESH_SOURCES = 100
export const PUBLIC_REFRESH_LIMIT = 3
export const PUBLIC_REFRESH_WINDOW = 60 * 1000
export const REFRESH_LEASE_MS = 2 * 60 * 1000
export const SOURCE_FETCH_TIMEOUT = 45 * 1000
export const FAILED_REFRESH_BACKOFF = 5 * 60 * 1000

const FAST_SOURCE_INTERVALS: Record<string, number> = {
  "jin10": 2 * 60 * 1000,
  "wallstreetcn-quick": 2 * 60 * 1000,
  "cls-telegraph": 2 * 60 * 1000,
}

export function getRefreshInterval(interval?: number, id?: string) {
  if (id && FAST_SOURCE_INTERVALS[id]) return FAST_SOURCE_INTERVALS[id]
  return Math.max(MIN_SOURCE_INTERVAL, interval && Number.isFinite(interval) ? interval : 10 * 60 * 1000)
}
