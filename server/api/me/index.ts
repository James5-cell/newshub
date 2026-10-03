export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "no-store")
  const user = event.context.user
  return { id: user.id, name: user.name, avatar: user.avatar }
})
