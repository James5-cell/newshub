import type { NewsItem } from "@shared/types"

interface HNApiResponse {
  hits?: {
    objectID: string
    title: string
    url?: string
    points?: number
    created_at_i?: number
  }[]
}

export default defineSource(async () => {
  const baseURL = "https://news.ycombinator.com"
  const data = await myFetch<HNApiResponse>(
    "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30",
  )

  const news: NewsItem[] = []
  if (data?.hits && Array.isArray(data.hits)) {
    for (const item of data.hits) {
      if (item.objectID && item.title) {
        news.push({
          id: item.objectID,
          title: item.title,
          url: `${baseURL}/item?id=${item.objectID}`,
          pubDate: item.created_at_i ? item.created_at_i * 1000 : undefined,
          extra: {
            info: item.points !== undefined ? `${item.points} points` : false,
          },
        })
      }
    }
  }

  return news
})
