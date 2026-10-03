import { XMLParser } from "fast-xml-parser"
import type { RSSInfo } from "../types"
import { fetchFeed } from "./feed-fetch"

export async function rss2json(url: string): Promise<RSSInfo | undefined> {
  if (!/^https?:\/\/[^\s$.?#].\S*/i.test(url)) return

  const data = await fetchFeed(url)

  return parseRSS(data as string)
}

export function parseRSS(data: string): RSSInfo {
  if (data.length > 512 * 1024) throw new Error("RSS feed exceeds size limit")
  if (/<!DOCTYPE|<!ENTITY/i.test(data)) throw new Error("RSS document declarations are not supported")
  const xml = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "$text",
    ignoreAttributes: false,
  })

  const result = xml.parse(data as string)

  let channel = result.rss && result.rss.channel ? result.rss.channel : result.feed
  if (Array.isArray(channel)) channel = channel[0]
  if (!channel) throw new Error("Response is not an RSS or Atom feed")

  const rss = {
    title: channel.title ?? "",
    description: channel.description ?? "",
    link: channel.link && channel.link.href ? channel.link.href : channel.link,
    image: channel.image ? channel.image.url : channel["itunes:image"] ? channel["itunes:image"].href : "",
    category: channel.category || [],
    updatedTime: channel.lastBuildDate ?? channel.updated,
    items: [],
  }

  let items = channel.item || channel.entry || []
  if (items && !Array.isArray(items)) items = [items]

  for (let i = 0; i < Math.min(items.length, 100); i++) {
    const val = items[i]
    const media = {}

    const obj = {
      id: typeof val.guid === "string" ? val.guid : val.guid?.$text ?? val.id,
      title: val.title && val.title.$text ? val.title.$text : val.title,
      description: val.summary && val.summary.$text ? val.summary.$text : val.description,
      link: Array.isArray(val.link)
        ? (val.link.find((link: any) => !link.rel || link.rel === "alternate")?.href ?? "")
        : val.link?.href ?? val.link,
      author: val.author && val.author.name ? val.author.name : val["dc:creator"],
      created: val.pubDate ?? val.published ?? val.created ?? val.updated,
      category: val.category || [],
      content: val.content && val.content.$text ? val.content.$text : val["content:encoded"],
      enclosures: val.enclosure ? (Array.isArray(val.enclosure) ? val.enclosure : [val.enclosure]) : [],
    };

    ["content:encoded", "podcast:transcript", "itunes:summary", "itunes:author", "itunes:explicit", "itunes:duration", "itunes:season", "itunes:episode", "itunes:episodeType", "itunes:image"].forEach((s) => {
      // @ts-expect-error TODO
      if (val[s]) obj[s.replace(":", "_")] = val[s]
    })

    if (val["media:thumbnail"]) {
      Object.assign(media, { thumbnail: val["media:thumbnail"] })
      obj.enclosures.push(val["media:thumbnail"])
    }

    if (val["media:content"]) {
      Object.assign(media, { thumbnail: val["media:content"] })
      obj.enclosures.push(val["media:content"])
    }

    if (val["media:group"]) {
      if (val["media:group"]["media:title"]) obj.title = val["media:group"]["media:title"]

      if (val["media:group"]["media:description"]) obj.description = val["media:group"]["media:description"]

      if (val["media:group"]["media:thumbnail"]) obj.enclosures.push(val["media:group"]["media:thumbnail"].url)

      if (val["media:group"]["media:content"]) obj.enclosures.push(val["media:group"]["media:content"])
    }

    Object.assign(obj, { media })

    // @ts-expect-error TODO
    rss.items.push(obj)
  }

  return rss
}
