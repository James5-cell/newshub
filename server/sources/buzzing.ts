import type { NewsItem } from "@shared/types"

/**
 * 動態 Buzzing 爬蟲工廠函數
 * 接收 subdomain 參數，向 https://{subdomain}.buzzing.cc/feed.json 抓取資料
 * 回傳符合 NewsNow 格式的 NewsItem[]
 *
 * 注意：此函數不使用 defineSource()，因為動態源沒有對應的靜態 SourceID。
 * 由 /api/s 在 runtime 根據 DB 記錄動態調用。
 */
export function createBuzzingGetter(subdomain: string) {
  return async (): Promise<NewsItem[]> => {
    const url = `https://${subdomain}.buzzing.cc/feed.json`
    const data: {
      title?: string
      items: {
        id?: string
        url: string
        title: string
        date_published?: string
        _original_published?: string
      }[]
    } = await myFetch(url)

    if (!data?.items?.length) {
      throw new Error(`Cannot fetch buzzing data for subdomain: ${subdomain}`)
    }

    return data.items.slice(0, 30).map(item => ({
      id: item.id || item.url,
      title: item.title,
      url: item.url,
      pubDate: item._original_published || item.date_published,
    }))
  }
}

export default {}
