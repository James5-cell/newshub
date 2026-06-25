import { getCustomSourceTable } from "#/database/source-config"

/**
 * 公開 API：讀取所有 is_active = true 的動態源清單
 * 前端首頁用來 merge 動態源到導覽列
 * 無需鑑權，任何人都可以讀取
 */
export default defineEventHandler(async () => {
  try {
    const customTable = await getCustomSourceTable()
    if (!customTable) return []
    const activeSources = await customTable.getActive()
    return activeSources.map(s => ({
      id: s.id,
      name: s.name,
      subdomain: s.subdomain,
      provider: s.provider,
      feed_url: s.feed_url,
      type: s.type || undefined,
      column: s.column_id,
      color: s.color || "blue",
      interval: s.interval_ms || 600000,
      home: s.home_url || (s.provider === "buzzing" ? `https://${s.subdomain}.buzzing.cc/` : ""),
      title: s.name,
    }))
  } catch (e: any) {
    logger.error("failed to get custom sources", e)
    return []
  }
})
