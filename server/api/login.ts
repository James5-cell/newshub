import process from "node:process"
import { createOAuthSession } from "#/utils/oauth-session"

export default defineEventHandler(async (event) => {
  if (!process.env.JWT_SECRET || !process.env.G_CLIENT_ID || !process.env.G_CLIENT_SECRET) {
    throw createError({ statusCode: 503, message: "Login is not configured" })
  }
  const session = await createOAuthSession(process.env.JWT_SECRET, process.env.G_CLIENT_ID)
  setCookie(event, "newshub_oauth", session.token, {
    httpOnly: true, secure: process.env.CF_PAGES === "1" || getRequestURL(event).protocol === "https:", sameSite: "lax", path: "/", maxAge: 600,
  })
  const query = new URLSearchParams({ client_id: process.env.G_CLIENT_ID, state: session.state,
    code_challenge: session.challenge, code_challenge_method: "S256" })
  return sendRedirect(event, `https://github.com/login/oauth/authorize?${query}`)
})
