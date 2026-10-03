import process from "node:process"
import { join } from "node:path"
import dotenv from "dotenv"

export default defineNitroPlugin((_nitroApp) => {
  // Load .env.server into process.env locally
  dotenv.config({ path: join(process.cwd(), ".env.server") })
})
