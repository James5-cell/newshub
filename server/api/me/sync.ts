import process from "node:process"
import { createError, defineEventHandler, readBody, setHeader } from "h3"
import { verifyPrimitiveMetadata } from "@shared/verify"
import { UserTable } from "#/database/user"

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store")
  try {
    const { id } = event.context.user
    const db = useDatabase()
    if (!db) throw new Error("Not found database")
    const userTable = new UserTable(db)
    if (process.env.INIT_TABLE !== "false") await userTable.init()
    let row
    if (event.method === "POST") {
      const { data, updatedTime, manualOrderByColumn } = verifyPrimitiveMetadata(await readBody(event))
      row = await userTable.setData(id, JSON.stringify({ data, manualOrderByColumn: manualOrderByColumn ?? {} }), updatedTime)
    } else {
      row = await userTable.getData(id)
    }
    const stored = row.data ? JSON.parse(row.data) : undefined
    // Before sort preferences were synced, the JSON column held the lists directly.
    const snapshot = stored?.data && !Array.isArray(stored.data) ? stored : { data: stored, manualOrderByColumn: {} }
    return {
      ...snapshot,
      updatedTime: row.updated,
      ...(event.method === "POST" && { success: true }),
    }
  } catch (e) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
