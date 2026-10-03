import { createRSSGetter } from "#/utils/rss-source"

export default defineSource({
  "rthk-international": createRSSGetter("https://rthk.hk/rthk/news/rss/c_expressnews_cinternational.xml"),
  "rthk-finance": createRSSGetter("https://rthk.hk/rthk/news/rss/c_expressnews_cfinance.xml"),
})
