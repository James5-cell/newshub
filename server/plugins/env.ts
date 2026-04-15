import dotenv from "dotenv"
import { join } from "node:path"

export default defineNitroPlugin((nitroApp) => {
  // Load .env.server into process.env locally
  dotenv.config({ path: join(process.cwd(), ".env.server") })
})
