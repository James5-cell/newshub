export default defineEventHandler((event) => {
  deleteCookie(event, "newshub_session", { path: "/" })
  return { success: true }
})
