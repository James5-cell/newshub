import { createError, defineEventHandler, getQuery, setHeader } from "h3"
import { refreshSource } from "#/utils/refresh"

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)
  if (typeof id !== "string" || !id || id.length > 120) {
    throw createError({ statusCode: 400, message: "请提供有效的来源 ID" })
  }
  // `latest` never bypasses the shared source cooldown, including for logged-in readers.
  setHeader(event, "Cache-Control", "no-store")
  return refreshSource(id)
})
