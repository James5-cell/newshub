import * as Dialog from "@radix-ui/react-dialog"
import { Command } from "cmdk"
import type { SourceID } from "@shared/types"
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import pinyin from "@shared/pinyin.json"
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
  const { history } = useRouter()
  const { data: catData, isError: directoryError, isLoading: directoryLoading, refetch: reloadDirectory } = useSourceCategories()

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialQuery = params.get("q")?.trim()
    if (!initialQuery) return
    setQuery(initialQuery)
    setDebouncedQuery(initialQuery)
    params.delete("q")
    const search = params.toString()
    const nextHref = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`
    history.replace(nextHref, { ...history.location.state, newsSearchOpen: true })
  }, [history])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(handler)
  }, [query])

  const { data: searchResults, isFetching, isError, refetch } = useQuery({
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
    enabled: opened && debouncedQuery.trim().length > 0,
    retry: false,
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
  const returnFocus = useRef<HTMLElement | null>(null)
  const [preferredValue, setPreferredValue] = useState("")

  useEffect(() => {
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
  }, [toggle])

  const hasSearchQuery = query.trim().length > 0
  const searching = hasSearchQuery && (query !== debouncedQuery || isFetching)
  const options = useMemo(() => {
    const entries = new Map<string, SourceID>()
    if (!hasSearchQuery) {
      for (const group of sourceItems) {
        for (const source of group.sources) entries.set(source.id, source.id)
      }
    } else if (!searching && !isError && searchResults) {
      for (const source of searchResults.sources) entries.set(source.id, source.id)
      for (const item of searchResults.items) entries.set(articleValue(item), item.sourceId)
    }
    return entries
  }, [hasSearchQuery, searching, isError, searchResults, sourceItems])
  const value = options.has(preferredValue) ? preferredValue : options.keys().next().value ?? ""
  const previewId = options.get(value)

  return (
    <Dialog.Root open={opened} onOpenChange={toggle}>
      <Dialog.Portal>
        <Dialog.Overlay cmdk-overlay="" />
        <Dialog.Content
          cmdk-dialog=""
          aria-describedby={undefined}
          onOpenAutoFocus={event => {
            event.preventDefault()
            returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            inputRef.current?.focus()
          }}
          onCloseAutoFocus={event => {
            event.preventDefault()
            const target = returnFocus.current
            const trigger = target?.isConnected && target !== document.body ? target : document.getElementById("open-news-search")
            trigger?.focus({ preventScroll: true })
          }}
        >
          <Dialog.Title className="sr-only">搜索新闻和来源</Dialog.Title>
          <Command label="搜索新闻和来源" value={value} onValueChange={setPreferredValue} shouldFilter={false}>
            <div className="flex items-center border-b border-white/10 pr-3">
              <Command.Input
                ref={inputRef}
                aria-label="搜索新闻和来源"
                placeholder="搜索新闻或来源"
                value={query}
                onValueChange={setQuery}
              />
              <button type="button" onClick={() => toggle(false)} aria-label="关闭搜索" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5">
                <span className="i-ph:x text-lg" aria-hidden="true" />
              </button>
            </div>
            <p className="px-4 pt-3 text-xs text-neutral-400">选择来源可关注或取消关注；选择新闻可打开原文。</p>
            <div className="search-panes">
              <Command.List>
                {searching ? (
                  <p className="px-1 py-4 text-sm text-neutral-400" role="status">正在搜索…</p>
                ) : hasSearchQuery && isError ? (
                  <div className="px-1 py-3 text-sm text-neutral-400">
                    <p role="status">搜索暂时不可用。</p>
                    <button type="button" className="min-h-11 text-red-300 underline" onClick={() => {
                      inputRef.current?.focus()
                      void refetch()
                    }}>重新搜索</button>
                  </div>
                ) : hasSearchQuery && searchResults ? (
                  <>
                    {searchResults.sources.length > 0 && (
                      <Command.Group heading="来源">
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
                      <Command.Group heading="相关新闻">
                        {searchResults.items.map(item => (
                          <NewsItemRow
                            key={articleValue(item)}
                            item={item}
                            metadata={catData?.metadata}
                          />
                        ))}
                      </Command.Group>
                    )}
                    {searchResults.sources.length === 0 && searchResults.items.length === 0 && !isFetching && (
                      <p className="px-1 py-4 text-sm text-neutral-400" role="status">没有找到结果，试试其他关键词。</p>
                    )}
                  </>
                ) : !sourceItems.length ? (
                  <div className="px-1 py-3 text-sm text-neutral-400">
                    <p role="status">
                      {directoryLoading ? "正在加载来源清单…" : directoryError ? "来源清单暂时无法加载，仍可输入关键词搜索新闻。" : "暂无可浏览的来源，可输入关键词搜索新闻。"}
                    </p>
                    {directoryError && (
                      <button type="button" className="min-h-11 text-red-300 underline" onClick={() => {
                        inputRef.current?.focus()
                        void reloadDirectory()
                      }}>重试来源清单</button>
                    )}
                  </div>
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
              <div className="search-preview">
                {previewId && <CardWrapper id={previewId} />}
              </div>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
      aria-label={`${item.name}，${isFocused ? "已关注，选择以取消关注" : "选择以关注"}`}
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
      <span className="flex items-center gap-1 text-xs text-neutral-400">
        <span className={$(isFocused ? "i-ph-star-fill text-amber-400" : "i-ph-star-duotone")} aria-hidden="true" />
        {isFocused ? "已关注" : "关注"}
      </span>
    </Command.Item>
  )
}

function articleValue(item: { sourceId: SourceID, id: string | number }) {
  return `article:${item.sourceId}:${item.id}`
}

function NewsItemRow({ item, metadata }: { item: any, metadata: any }) {
  const relativeTime = useRelativeTime(item.pubDate)
  return (
    <Command.Item
      value={articleValue(item)}
      className="news-result cursor-pointer rounded-md hover:bg-white/[0.05] aria-selected:bg-white/[0.08]"
      onSelect={() => {
        const width = window.innerWidth
        const url = width < 768 ? item.mobileUrl || item.url : item.url
        window.open(url, "_blank", "noopener,noreferrer")
      }}
    >
      <span className="result-title">{item.title}</span>
      <span className="result-meta">
        <span className="w-4 h-4 rounded-md bg-cover shrink-0" style={getIconStyle(item.sourceId, metadata)} />
        <span className="min-w-0 truncate">{item.sourceName}</span>
        {item.pubDate && <span className="ml-auto shrink-0">{relativeTime}</span>}
      </span>
    </Command.Item>
  )
}
