import { afterEach, expect, it, vi } from "vitest"
import { createApp, defineEventHandler, toWebHandler } from "h3"
import { SignJWT } from "jose"
import auth from "#/middleware/auth"
afterEach(() => vi.unstubAllEnvs())
function app() {
  const app = createApp()
  app.use(auth)
  app.use(defineEventHandler(event => ({ user: event.context.user?.id ?? null })))
  return toWebHandler(app)
}
it("allows explicit public endpoints without OAuth, but protects admin and users", async () => {
  vi.stubEnv("JWT_SECRET", "")
  const handle = app()
  for (const path of ["custom-sources", "source-categories", "enable-login", "search", "status"]) {
    expect((await handle(new Request(`https://example.com/api/${path}`))).status).toBe(200)
  }
  for (const path of ["me", "admin/check", "sneaky"]) {
    expect((await handle(new Request(`https://example.com/api/${path}`))).status).toBe(506)
  }
})
it("accepts a signed session cookie and rejects cross-origin writes", async () => {
  vi.stubEnv("JWT_SECRET", "long-test-secret-for-session")
  vi.stubEnv("G_CLIENT_ID", "test-client")
  vi.stubEnv("G_CLIENT_SECRET", "test-client-secret")
  const token = await new SignJWT({ id: "user-1", type: "github" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m").sign(new TextEncoder().encode("long-test-secret-for-session"))
  const handle = app()
  const response = await handle(new Request("https://example.com/api/me", { headers: { cookie: `newshub_session=${token}`, authorization: "Bearer obsolete-token" } }))
  expect(await response.json()).toEqual({ user: "user-1" })
  expect((await handle(new Request("https://example.com/api/me/logout", { method: "POST", headers: { cookie: `newshub_session=${token}`, origin: "https://untrusted.example" } }))).status).toBe(403)
})
