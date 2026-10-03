import { SignJWT, jwtVerify } from "jose"
import { randomUUID, subtle } from "uncrypto"

export async function createOAuthSession(secret: string, clientId: string) {
  const state = randomUUID()
  const verifier = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "")
  const bytes = new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(verifier)))
  const challenge = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const token = await new SignJWT({ state, verifier }).setProtectedHeader({ alg: "HS256" })
    .setIssuer("newshub-oauth").setAudience(clientId).setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret))
  return { state, verifier, challenge, token }
}

export async function verifyOAuthSession(token: string, state: string, secret: string, clientId: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: ["HS256"], issuer: "newshub-oauth", audience: clientId,
  })
  if (payload.state !== state || typeof payload.verifier !== "string") throw new Error("Invalid OAuth state")
  return payload.verifier
}
