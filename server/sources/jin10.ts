interface Jin10Item {
  id: string
  time: string
  type: number
  data: {
    pic?: string
    title?: string
    source?: string
    content?: string
    source_link?: string
    vip_title?: string
    lock?: boolean
    vip_level?: number
    vip_desc?: string
  }
  important: number
  tags: string[]
  channel: number[]
  remark: any[]
}

export default defineSource(async (context) => {
  const timestamp = Date.now()
  const url = `https://www.jin10.com/flash_newest.js?t=${timestamp}`

  const rawData: string = await myFetch(url, { signal: context?.signal })

  const jsonStr = (rawData as string)
    .replace(/^var\s+newest\s*=\s*/, "") // 移除开头的变量声明
    .replace(/;*$/, "") // 移除末尾可能存在的分号
    .trim() // 移除首尾空白字符
  const data: Jin10Item[] = JSON.parse(jsonStr)

  return data.filter(k => (k.data.title || k.data.content) && !k.channel?.includes(5)).map((k) => {
    const text = (k.data.title || k.data.content)!.replace(/<\/?b>/g, "")
    return {
      id: k.id,
      title: text,
      pubDate: tranformToUTC(k.time, "YYYY-MM-DD HH:mm:ss", "Asia/Shanghai"),
      url: `https://flash.jin10.com/detail/${k.id}`,
      extra: {
        hover: text,
        info: !!k.important && "✰",
      },
    }
  })
})
