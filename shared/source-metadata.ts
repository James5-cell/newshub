export interface SearchMetadata {
  aliases: string[]
  tags: string[]
}

export const staticSourceMetadata: Record<string, SearchMetadata> = {
  "v2ex": { aliases: ["v2ex", "v2", "威二", "v2ex-share"], tags: ["论坛", "技术", "程序员", "分享"] },
  "v2ex-share": { aliases: ["v2ex", "v2", "威二", "v2ex-share"], tags: ["论坛", "技术", "程序员", "分享"] },
  "zhihu": { aliases: ["知乎", "zhihu", "zh"], tags: ["问答", "知识", "社交", "热门"] },
  "weibo": { aliases: ["微博", "weibo", "wb", "新浪微博"], tags: ["社交", "热搜", "舆情", "娱乐"] },
  "zaobao": { aliases: ["联合早报", "早报", "zaobao"], tags: ["新闻", "国际", "政治"] },
  "coolapk": { aliases: ["酷安", "coolapk", "基安", "数码"], tags: ["科技", "数码", "手机", "社区"] },
  "36kr": { aliases: ["36氪", "36kr", "kr"], tags: ["科技", "创投", "商业", "创业"] },
  "bilibili": { aliases: ["bilibili", "b站", "bili", "哔哩哔哩", "哔哩"], tags: ["视频", "动漫", "弹幕", "娱乐"] },
  "github": { aliases: ["github", "gh", "git"], tags: ["开源", "开发", "程序员", "技术"] },
  "ithome": { aliases: ["it之家", "ithome", "软媒"], tags: ["科技", "数码", "资讯", "手机"] },
  "hupu": { aliases: ["虎扑", "hupu", "步行街"], tags: ["体育", "篮球", "论坛", "娱乐"] },
  "tieba": { aliases: ["百度贴吧", "贴吧", "tieba"], tags: ["论坛", "兴趣", "社区"] },
  "toutiao": { aliases: ["今日头条", "头条", "toutiao"], tags: ["新闻", "推荐", "资讯"] },
  "cls": { aliases: ["财联社", "cls"], tags: ["财经", "股市", "快讯", "股票"] },
  "xueqiu": { aliases: ["雪球", "xueqiu", "xq"], tags: ["财经", "投资", "股票", "理财"] },
  "gelonghui": { aliases: ["格隆汇", "gelonghui", "glh"], tags: ["财经", "投资", "港股", "美股"] },
  "solidot": { aliases: ["solidot", "奇客"], tags: ["科技", "开源", "资讯"] },
  "hackernews": { aliases: ["hacker news", "hn"], tags: ["科技", "创投", "技术"] },
  "producthunt": { aliases: ["product hunt", "ph"], tags: ["产品", "创意", "科技"] },
  "kuaishou": { aliases: ["快手", "kuaishou", "ks"], tags: ["视频", "短视频", "娱乐"] },
  "jin10": { aliases: ["金十数据", "金十", "jin10"], tags: ["财经", "外汇", "股市", "数据"] },
  "nowcoder": { aliases: ["牛客", "牛客网", "nowcoder"], tags: ["求职", "招聘", "技术", "面试"] },
  "sspai": { aliases: ["少数派", "sspai"], tags: ["效率", "科技", "数码", "生活"] },
  "qqvideo": { aliases: ["腾讯视频", "腾讯", "txvideo"], tags: ["视频", "电视剧", "电影", "综艺"] },
  "douban": { aliases: ["豆瓣", "douban", "db"], tags: ["电影", "图书", "小组", "娱乐"] },
  "wallstreetcn": { aliases: ["华尔街见闻", "华尔街", "wallstreetcn"], tags: ["财经", "股市", "宏观"] }
}
