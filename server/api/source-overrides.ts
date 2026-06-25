import { getOverrideTable } from "#/database/source-config"

export default defineEventHandler(async (event) => {
  const table = await getOverrideTable()
  if (!table) {
    return { hiddenSourceIds: [] } // fail-open for compatibility
  }

  const hiddenIds = await table.getHidden()
  // Add caching header so frontend caches this appropriately
  setHeader(event, "Cache-Control", "no-cache")

  return { hiddenSourceIds: hiddenIds }
})
