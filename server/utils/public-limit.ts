import process from "node:process"
import { getHeader, getRequestIP } from "h3"
import type { H3Event } from "h3"
import { subtle } from "uncrypto"
import { getRefreshControl } from "#/database/refresh-control"

export async function consumePublicLimit(event: H3Event, scope: string, limit: number, windowMs = 60_000) {
  const ip = (process.env.CF_PAGES ? getHeader(event, "cf-connecting-ip") : undefined) || getRequestIP(event) || "unknown"
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(ip))
  const identity = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
  const control = await getRefreshControl()
  return control.consume(`${scope}:${identity}`, Date.now(), limit, windowMs)
}
