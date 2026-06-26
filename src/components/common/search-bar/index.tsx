import { Command } from "cmdk"
import { useMount } from "react-use"
import type { SourceID } from "@shared/types"
import { useMemo, useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import pinyin from "@shared/pinyin.json"
import { OverlayScrollbar } from "../overlay-scrollbar"
import { CardWrapper } from "~/components/column/card"

import "./cmdk.css"

interface SourceItemProps {
  id: SourceID
  name: string
  title?: string
  column: any
  pinyin: string
}

function groupByColumn(items: SourceItemProps[]) {
  return items.reduce((acc, item) => {
    const k = acc.find(i => i.column === item.column)
    if (k) k.sources = [...k.sources, item]
    else acc.push({ column: item.column, sources: [item] })
    return acc
  }, [] as {
    column: string
    sources: SourceItemProps[]
  }[]).sort((m, n) => {
    if (m.column === "科技") return -1
    if (n.column === "科技") return 1

    if (m.column === "未分类") return 1
    if (n.column === "未分类") return -1

    return m.column < n.column ? -1 : 1
  })
}

const getIconStyle = (id: string, metadata: any) => {
  const m = metadata?.[id]
  let url = ""
  if (m) {
    if (!m.isDynamic) {
      url = `/icons/${id.split("-")[0]}.png`
    } else if (m.provider === "buzzing") {
      url = `https://${m.subdomain}.buzzing.cc/icon.png`
    } else if (m.home) {
      try {
        url = `https://www.google.com/s2/favicons?domain=${new URL(m.home).hostname}&sz=64`
      } catch {}
    }
  } else {
    url = `/icons/${id.split("-")[0]}.png`
  }
  return { backgroundImage: `url(${url})` }
}

export function SearchBar() {
  const { opened, toggle } = useSearchBar()
  const { data: catData } = useSourceCategories()

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(handler)
  }, [query])

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return null
      return await myFetch<{
        intent: string
        sources: Array<{ id: SourceID, name: string, title?: string, column: string, color: string }>
        items: Array<{
          id: string | number
          title: string
          url: string
          mobileUrl?: string
          pubDate?: number | string
          sourceId: SourceID
          sourceName: string
          sourceColor: string
        }>
      }>(`/search?q=${encodeURIComponent(debouncedQuery)}`)
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 5000,
  })

  const sourceItems = useMemo(() => {
    const list: SourceItemProps[] = []
    const meta = catData?.metadata || {}

    typeSafeObjectEntries(sources)
      .filter(([k, s]) => !s.redirect && meta[k])
      .forEach(([k, s]) => {
        const m = meta[k]
        list.push({
          id: k,
          title: m?.title || s.title || "",
          column: s.column && s.column in columns ? columns[s.column as keyof typeof columns].zh : "未分类",
          name: m?.name || s.name,
          pinyin: pinyin?.[k as keyof typeof pinyin] ?? "",
        })
      })

    Object.entries(meta).forEach(([k, m]) => {
      if (m.isDynamic && !list.some(item => item.id === k)) {
        list.push({
          id: k as SourceID,
          title: m.title || "",
          column: m.column_id && m.column_id in columns ? columns[m.column_id as keyof typeof columns].zh : "未分类",
          name: m.name,
          pinyin: "",
        })
      }
    })

    return groupByColumn(list)
  }, [catData])

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState<SourceID>("github-trending-today")

  useMount(() => {
    inputRef?.current?.focus()
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener("keydown", keydown)
    return () => {
      document.removeEventListener("keydown", keydown)
    }
  })

  // Synchronize CMDK value change to right pane preview card
  const handleValueChange = (v: string) => {
    if (v.startsWith("article:")) {
      const parts = v.split(":")
      const srcId = parts[1] as SourceID
      const allMeta = catData?.metadata || {}
      if (srcId in sources || srcId in allMeta) {
        setValue(srcId)
      }
    } else {
      const allMeta = catData?.metadata || {}
      if (v in sources || v in allMeta) {
        setValue(v as SourceID)
      }
    }
  }

  const hasSearchQuery = debouncedQuery.trim().length > 0

  return (
    <Command.Dialog
      open={opened}
      onOpenChange={toggle}
      value={value}
      onValueChange={handleValueChange}
      shouldFilter={false} // Use backend search results directly
    >
      <Command.Input
        ref={inputRef}
        autoFocus
        placeholder="搜索你想要的 (可搜订阅源、中英文别名或具体文章内容...)"
        value={query}
        onValueChange={setQuery}
      />
      <div className="md:flex pt-2">
        <OverlayScrollbar defer className="overflow-y-auto md:min-w-275px">
          <Command.List>
            {hasSearchQuery && searchResults ? (
              <>
                {searchResults.sources.length > 0 && (
                  <Command.Group heading="直达来源 (Sources)">
                    {searchResults.sources.map(src => (
                      <SourceItem
                        key={src.id}
                        item={{
                          id: src.id,
                          name: src.name,
                          title: src.title,
                          column: src.column,
                          pinyin: ""
                        }}
                        metadata={catData?.metadata}
                      />
                    ))}
                  </Command.Group>
                )}
                {searchResults.items.length > 0 && (
                  <Command.Group heading="相关内容 (Articles)">
                    {searchResults.items.map(item => (
                      <NewsItemRow
                        key={item.id}
                        item={item}
                        metadata={catData?.metadata}
                      />
                    ))}
                  </Command.Group>
                )}
                {searchResults.sources.length === 0 && searchResults.items.length === 0 && !isFetching && (
                  <Command.Empty> 没有找到，可以前往 Github 提 issue </Command.Empty>
                )}
              </>
            ) : (
              sourceItems.map(({ column, sources }) => (
                <Command.Group heading={column} key={column}>
                  {sources.map(item => (
                    <SourceItem item={item} key={item.id} metadata={catData?.metadata} />
                  ))}
                </Command.Group>
              ))
            )}
          </Command.List>
        </OverlayScrollbar>
        <div className="flex-1 pt-2 px-4 min-w-350px max-md:hidden">
          <CardWrapper id={value} />
        </div>
      </div>
    </Command.Dialog>
  )
}

function SourceItem({ item, metadata }: {
  item: SourceItemProps
  metadata: any
}) {
  const { isFocused, toggleFocus } = useFocusWith(item.id)
  return (
    <Command.Item
      keywords={[item.name, item.title ?? "", item.pinyin]}
      value={item.id}
      className="flex justify-between items-center p-2 rounded-md hover:bg-white/[0.05] aria-selected:bg-white/[0.08]"
      onSelect={toggleFocus}
    >
      <span className="flex gap-2 items-center">
        <span
          className={$("w-4 h-4 rounded-md bg-cover")}
          style={getIconStyle(item.id, metadata)}
        />
        <span>{item.name}</span>
        <span className="text-xs text-neutral-400/80 self-end mb-3px">{item.title}</span>
      </span>
      <span className={$(isFocused ? "i-ph-star-fill" : "i-ph-star-duotone", "bg-primary op-40")}></span>
    </Command.Item>
  )
}

function NewsItemRow({ item, metadata }: { item: any, metadata: any }) {
  const relativeTime = useRelativeTime(item.pubDate)
  return (
    <Command.Item
      value={`article:${item.sourceId}:${item.id}`}
      className="flex justify-between items-center p-2 cursor-pointer rounded-md hover:bg-white/[0.05] aria-selected:bg-white/[0.08]"
      onSelect={() => {
        const width = window.innerWidth
        const url = width < 768 ? item.mobileUrl || item.url : item.url
        window.open(url, "_blank")
      }}
    >
      <span className="flex gap-2 items-center min-w-0 flex-1">
        <span
          className="w-4 h-4 rounded-md bg-cover flex-shrink-0"
          style={getIconStyle(item.sourceId, metadata)}
        />
        <span className="text-xs text-neutral-400 flex-shrink-0 font-medium select-none">
          [{item.sourceName}]
        </span>
        <span className="truncate text-white/90 text-sm leading-snug">{item.title}</span>
      </span>
      {item.pubDate && (
        <span className="text-xs text-neutral-500 flex-shrink-0 ml-2 whitespace-nowrap select-none">
          {relativeTime}
        </span>
      )}
    </Command.Item>
  )
}
