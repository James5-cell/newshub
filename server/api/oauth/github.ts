import process from "node:process"
import { SignJWT } from "jose"
import { verifyOAuthSession } from "#/utils/oauth-session"
import { UserTable } from "#/database/user"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const session = getCookie(event, "newshub_oauth")
  deleteCookie(event, "newshub_oauth", { path: "/" })
  if (!session || typeof query.state !== "string" || typeof query.code !== "string") {
    throw createError({ statusCode: 400, message: "Invalid OAuth callback" })
  }
  let verifier: string
  try {
    verifier = await verifyOAuthSession(session, query.state, process.env.JWT_SECRET!, process.env.G_CLIENT_ID!)
  } catch {
    throw createError({ statusCode: 400, message: "OAuth session expired or state mismatch" })
  }
  const db = useDatabase()
  const userTable = db ? new UserTable(db) : undefined
  if (!userTable) throw new Error("db is not defined")
  if (process.env.INIT_TABLE !== "false") await userTable.init()

  const response: {
    access_token: string
    token_type: string
    scope: string
  } = await myFetch(
    `https://github.com/login/oauth/access_token`,
    {
      method: "POST",
      body: {
        client_id: process.env.G_CLIENT_ID,
        client_secret: process.env.G_CLIENT_SECRET,
        code: query.code,
        code_verifier: verifier,
      },
      headers: {
        accept: "application/json",
      },
    },
  )

  const userInfo: {
    id: number
    name: string
    avatar_url: string
    email: string
    notification_email: string
  } = await myFetch(`https://api.github.com/user`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `token ${response.access_token}`,
      // 必须有 user-agent，在 cloudflare worker 会报错
      "User-Agent": "NewsNow App",
    },
  })

  const userID = String(userInfo.id)
  await userTable.addUser(userID, userInfo.notification_email || userInfo.email, "github")

  const jwtToken = await new SignJWT({
    id: userID,
    type: "github",
    name: userInfo.name,
    avatar: userInfo.avatar_url,
  })
    .setExpirationTime("7d")
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(process.env.JWT_SECRET!))

  setCookie(event, "newshub_session", jwtToken, {
    httpOnly: true, secure: process.env.CF_PAGES === "1" || getRequestURL(event).protocol === "https:", sameSite: "lax", path: "/", maxAge: 7 * 86400,
  })
  return sendRedirect(event, "/")
})
