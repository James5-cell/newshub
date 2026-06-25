import type { NewsItem, SourceID, SourceResponse } from "@shared/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion, useInView } from "framer-motion"
import { useWindowSize } from "react-use"
import { forwardRef, useImperativeHandle, useState } from "react"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import { safeParseString } from "~/utils"
import { customSourceMapAtom } from "~/hooks/useCustomSources"
import { useSourceCategories } from "~/hooks/useSourceCategories"
import { sources } from "@shared/sources"

export interface ItemsProps extends React.HTMLAttributes<HTMLDivElement> {
  id: SourceID
  isDragging?: boolean
  setHandleRef?: (ref: HTMLElement | null) => void
}

interface NewsCardProps {
  id: SourceID
  setHandleRef?: (ref: HTMLElement | null) => void
}

export const CardWrapper = forwardRef<HTMLElement, ItemsProps>(({ id, isDragging, setHandleRef, style, ...props }, dndRef) => {
  const ref = useRef<HTMLDivElement>(null)

  const inView = useInView(ref, {
    once: true,
  })

  useImperativeHandle(dndRef, () => ref.current! as HTMLDivElement)

  return (
    <div
      ref={ref}
      className={$(
        "flex flex-col h-500px rounded-lg cursor-default",
        "transition-all duration-200",
        isDragging && "op-50",
        "bg-white/[0.025] border border-white/[0.06]",
        "hover:border-white/[0.12]",
      )}
      style={{
        transformOrigin: "50% 50%",
        ...style,
      }}
      {...props}
    >
      {inView && <NewsCard id={id} setHandleRef={setHandleRef} />}
    </div>
  )
})

function NewsCard({ id, setHandleRef }: NewsCardProps) {
  const { refresh } = useRefetch()
  const { loggedIn } = useLogin()
  const queryClient = useQueryClient()
  const toaster = useToast()

  const { data: statusRes } = useSourcesStatus()
  const sourceStatus = statusRes?.data?.find(s => s.id === id)
  const userLimit = statusRes?.userLimit

  const now = Date.now()
  const resetAt = userLimit?.resetAt ?? 0
  const count = userLimit?.count ?? 0
  const limitReached = count >= 3 && now < resetAt

  const minutesLeft = Math.ceil((resetAt - now) / 60000)
  const refreshTooltip = loggedIn
    ? (limitReached
        ? `已用 3/3 次，${minutesLeft}分钟后重置`
        : `手动刷新 (已用 ${count}/3 次)`)
    : "刷新"

  const handleSingleRefresh = async () => {
    if (!loggedIn) {
      refresh(id)
      return
    }

    if (limitReached) {
      toaster(`已达到手动刷新上限，请在 ${minutesLeft} 分钟后重置。`, { type: "warning" })
      return
    }

    try {
      toaster("正在强制刷新板块...", { type: "info" })
      const res = await myFetch<any>("/refresh", {
        method: "POST",
        body: { source: id },
        headers: {
          Authorization: `Bearer ${safeParseString(localStorage.getItem("jwt"))}`
        }
      })
      
      if (res?.rateLimit) {
        queryClient.setQueryData(["sources-status", loggedIn], (old: any) => {
          if (!old) return old
          return { ...old, userLimit: res.rateLimit }
        })
      }

      toaster("刷新成功", { type: "success" })
      cacheSources.delete(id)
      await queryClient.refetchQueries({
        queryKey: ["source", id]
      })
    } catch (err: any) {
      toaster(err.message || "刷新失败", { type: "error" })
    }
  }

  const { data: catData } = useSourceCategories()
  const meta = catData?.metadata?.[id]

  const customMap = useAtomValue(customSourceMapAtom)
  const staticSource = sources[id]
  const customSource = customMap[id as string]

  const name = meta?.name || staticSource?.name || customSource?.name || (id as string)
  const title = meta?.title || staticSource?.title || customSource?.title
  const desc = staticSource?.desc
  const home = meta?.home || staticSource?.home || customSource?.home
  const sourceType = meta?.type || staticSource?.type || customSource?.type

  const getIconUrl = () => {
    if (meta) {
      if (!meta.isDynamic) return `/icons/${(id as string).split("-")[0]}.png`
      if (meta.provider === "buzzing") return `https://${meta.subdomain}.buzzing.cc/icon.png`
      if (meta.home) {
        try { return `https://www.google.com/s2/favicons?domain=${new URL(meta.home).hostname}&sz=64` } catch {}
      }
      return ""
    }
    if (staticSource) return `/icons/${(id as string).split("-")[0]}.png`
    if (customSource) {
      if (customSource.provider === "buzzing") return `https://${customSource.subdomain}.buzzing.cc/icon.png`
      if (customSource.home) {
        try { return `https://www.google.com/s2/favicons?domain=${new URL(customSource.home).hostname}&sz=64` } catch {}
      }
      return ""
    }
    return ""
  }

  const iconUrl = getIconUrl()

  const { data, isFetching, isError } = useQuery({
    queryKey: ["source", id],
    queryFn: async ({ queryKey }) => {
      const id = queryKey[1] as SourceID
      let url = `/s?id=${id}`
      const headers: Record<string, any> = {}
      if (refetchSources.has(id)) {
        url = `/s?id=${id}&latest`
        const jwt = safeParseString(localStorage.getItem("jwt"))
        if (jwt) headers.Authorization = `Bearer ${jwt}`
        refetchSources.delete(id)
      } else if (cacheSources.has(id)) {
        await delay(200)
        return cacheSources.get(id)
      }

      const response: SourceResponse = await myFetch(url, {
        headers,
      })

      function diff() {
        try {
          const sType = sources[id]?.type || customMap[id as string]?.type
          if (response.items && sType === "hottest" && cacheSources.has(id)) {
            response.items.forEach((item, i) => {
              const o = cacheSources.get(id)!.items.findIndex(k => k.id === item.id)
              item.extra = {
                ...item?.extra,
                diff: o === -1 ? undefined : o - i,
              }
            })
          }
        } catch (e) {
          console.error(e)
        }
      }

      diff()

      cacheSources.set(id, response)
      return response
    },
    placeholderData: prev => prev,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { isFocused, toggleFocus } = useFocusWith(id)

  return (
    <>
      {/* Card header */}
      <div className="flex justify-between items-center px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex gap-2 items-center min-w-0">
          <a
            className="w-7 h-7 rounded-full bg-cover bg-center flex-shrink-0 border border-white/10"
            target="_blank"
            href={home}
            title={desc}
            style={{
              backgroundImage: iconUrl ? `url(${iconUrl})` : undefined,
            }}
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-white/90 truncate" title={desc}>
                {name}
              </span>
              {title && title.trim().toLowerCase() !== name.trim().toLowerCase() && (
                <span className="text-[10px] text-gray-500 truncate flex-shrink-0">{title}</span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <UpdatedTime isError={isError} updatedTime={data?.updatedTime} />
              {sourceStatus?.status === "failed" && (
                <span
                  title={sourceStatus.error_message || "更新失败"}
                  className="i-ph:warning-duotone text-red-400 flex-shrink-0 cursor-help"
                />
              )}
            </span>
          </div>
        </div>
        <div className="flex gap-1 items-center text-sm flex-shrink-0">
          <button
            type="button"
            title={refreshTooltip}
            disabled={loggedIn && limitReached}
            className={$(
              "btn p-1 rounded transition-all duration-200",
              isFetching
                ? "animate-spin i-ph:circle-dashed-duotone op-50"
                : "i-ph:arrow-counter-clockwise-duotone op-30 hover:op-70",
              loggedIn && limitReached && "op-10 cursor-not-allowed hover:op-10"
            )}
            onClick={handleSingleRefresh}
          />
          <button
            type="button"
            className={$(
              "btn p-1 rounded transition-all duration-200",
              isFocused
                ? "i-ph:star-fill text-amber-400/70"
                : "i-ph:star-duotone op-30 hover:op-70",
            )}
            onClick={toggleFocus}
          />
          {setHandleRef && (
            <div
              ref={setHandleRef}
              className="btn i-ph:dots-six-vertical-duotone op-20 hover:op-50 cursor-grab transition-opacity duration-200"
            />
          )}
        </div>
      </div>

      {/* Scrollable news feed */}
      <OverlayScrollbar
        className={$([
          "flex-1 overflow-y-auto",
          isFetching && "animate-pulse",
        ])}
        options={{
          overflow: { x: "hidden" },
        }}
        defer
      >
        <div className={$("transition-opacity duration-300", isFetching && "op-30")}>
          {!!data?.items?.length && (
            sourceType === "hottest"
              ? <NewsListHot items={data.items} />
              : <NewsListTimeLine items={data.items} />
          )}
        </div>
      </OverlayScrollbar>
    </>
  )
}

function UpdatedTime({ isError, updatedTime }: { updatedTime: any, isError: boolean }) {
  const relativeTime = useRelativeTime(updatedTime ?? "")
  if (relativeTime) return `${relativeTime}更新`
  if (isError) return <span className="text-red-400/60">获取失败</span>
  return "加载中..."
}

function DiffNumber({ diff }: { diff: number }) {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    setShown(true)
    const timer = setTimeout(() => {
      setShown(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [setShown, diff])

  return (
    <AnimatePresence>
      {shown && (
        <motion.span
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 0.5, y: -7 }}
          exit={{ opacity: 0, y: -15 }}
          className={$("absolute left-0 text-[10px]", diff < 0 ? "text-green-400/70" : "text-red-400/70")}
        >
          {diff > 0 ? `+${diff}` : diff}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function ExtraInfo({ item }: { item: NewsItem }) {
  if (item?.extra?.info) {
    return <>{item.extra.info}</>
  }
  if (item?.extra?.icon) {
    const { url, scale } = typeof item.extra.icon === "string" ? { url: item.extra.icon, scale: undefined } : item.extra.icon
    return (
      <img
        src={url}
        style={{
          transform: `scale(${scale ?? 1})`,
        }}
        className="h-4 inline mt--1"
        referrerPolicy="no-referrer"
        onError={e => e.currentTarget.style.display = "none"}
      />
    )
  }
}

function NewsUpdatedTime({ date }: { date: string | number }) {
  const relativeTime = useRelativeTime(date)
  return <>{relativeTime}</>
}

function NewsListHot({ items }: { items: NewsItem[] }) {
  const { width } = useWindowSize()
  return (
    <ol className="flex flex-col">
      {items?.map((item, i) => (
        <a
          href={width < 768 ? item.mobileUrl || item.url : item.url}
          target="_blank"
          key={item.id}
          title={item.extra?.hover}
          className={$(
            "flex gap-2 items-center items-stretch relative cursor-pointer [&_*]:cursor-pointer",
            "py-1.5 px-2 transition-colors duration-150",
            "hover:bg-white/[0.04]",
            "border-b border-white/[0.04] last:border-b-0",
            "visited:(text-neutral-500)",
          )}
        >
          <span className="bg-white/[0.06] min-w-5 h-5 flex justify-center items-center rounded text-[10px] text-gray-500 font-mono self-start mt-0.5">
            {i + 1}
          </span>
          {!!item.extra?.diff && <DiffNumber diff={item.extra.diff} />}
          <span className="flex-1 min-w-0">
            <span className="text-sm text-white/85 leading-snug">
              {item.title}
            </span>
            <span className="text-[10px] text-gray-500 ml-1.5 align-middle whitespace-nowrap">
              <ExtraInfo item={item} />
            </span>
          </span>
        </a>
      ))}
    </ol>
  )
}

function NewsListTimeLine({ items }: { items: NewsItem[] }) {
  const { width } = useWindowSize()
  return (
    <ol className="flex flex-col">
      {items?.map(item => (
        <li
          key={`${item.id}-${item.pubDate || item?.extra?.date || ""}`}
          className="border-b border-white/[0.04] last:border-b-0"
        >
          {/* Meta line: timestamp + extra */}
          <div className="flex items-center gap-1.5 px-2 pt-1.5">
            <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
            <span className="text-[10px] text-gray-500">
              {(item.pubDate || item?.extra?.date) && <NewsUpdatedTime date={(item.pubDate || item?.extra?.date)!} />}
            </span>
            <span className="text-[10px] text-gray-600">
              <ExtraInfo item={item} />
            </span>
          </div>
          {/* Title */}
          <a
            className={$(
              "block px-2 pb-1.5 pt-0.5 cursor-pointer [&_*]:cursor-pointer",
              "transition-colors duration-150",
              "hover:bg-white/[0.04]",
              "visited:(text-neutral-500)",
            )}
            href={width < 768 ? item.mobileUrl || item.url : item.url}
            title={item.extra?.hover}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="text-sm text-white/85 leading-snug">{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}
