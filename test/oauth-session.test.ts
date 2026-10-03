import { expect, it } from "vitest"
import { createOAuthSession, verifyOAuthSession } from "#/utils/oauth-session"
it("binds OAuth state to the signed browser session and client", async () => {
  const session = await createOAuthSession("long-test-secret-for-oauth-session", "client")
  expect(session.challenge).toHaveLength(43)
  expect(await verifyOAuthSession(session.token, session.state, "long-test-secret-for-oauth-session", "client")).toBe(session.verifier)
  await expect(verifyOAuthSession(session.token, "wrong", "long-test-secret-for-oauth-session", "client")).rejects.toThrow()
  await expect(verifyOAuthSession(session.token, session.state, "long-test-secret-for-oauth-session", "another-client")).rejects.toThrow()
})
