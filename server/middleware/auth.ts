import process from "node:process"
import { createError, defineEventHandler, getCookie, getHeader, getRequestURL } from "h3"
import { jwtVerify } from "jose"

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) return
  if (["JWT_SECRET", "G_CLIENT_ID", "G_CLIENT_SECRET"].find(k => !process.env[k])) {
    event.context.disabledLogin = true
    const publicPaths = ["/api/s", "/api/s/entire", "/api/latest", "/api/mcp", "/api/status", "/api/refresh", "/api/search", "/api/source-categories", "/api/source-overrides", "/api/custom-sources", "/api/enable-login"]
    if (!publicPaths.includes(url.pathname) && !url.pathname.startsWith("/api/cron/")) {
      throw createError({ statusCode: 506, message: "Server not configured, disable login" })
    }
  } else {
    if (["/api/s", "/api/me", "/api/admin", "/api/refresh", "/api/status"].find(p => url.pathname.startsWith(p))) {
      const cookie = getCookie(event, "newshub_session")
      const token = cookie || getHeader(event, "Authorization")?.replace(/Bearer\s*/, "")?.trim()
      const origin = getHeader(event, "origin")
      if (cookie && !["GET", "HEAD", "OPTIONS"].includes(event.method) && origin && origin !== url.origin) {
        throw createError({ statusCode: 403, message: "Cross-origin session request denied" })
      }
      if (token) {
        try {
          const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET), { algorithms: ["HS256"] }) as { payload?: { id: string, type: string } }
          if (payload?.id) {
            event.context.user = {
              id: payload.id,
              type: payload.type,
              name: (payload as any).name,
              avatar: (payload as any).avatar,
            }
          }
        } catch {
          if (url.pathname.startsWith("/api/me") || url.pathname.startsWith("/api/admin"))
            throw createError({ statusCode: 401, message: "JWT verification failed" })
          else logger.warn("JWT verification failed")
        }
      } else if (url.pathname.startsWith("/api/me") || url.pathname.startsWith("/api/admin")) {
        throw createError({ statusCode: 401, message: "JWT verification failed" })
      }
    }
  }
})
