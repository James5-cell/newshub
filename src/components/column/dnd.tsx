import { type PropsWithChildren, useLayoutEffect } from "react"
import type { FixedColumnID, SourceID } from "@shared/types"
import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { createPortal } from "react-dom"
import { useThrottleFn } from "ahooks"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { useMedia } from "react-use"
import { sources } from "@shared/sources"
import { Link } from "@tanstack/react-router"
import { DndContext } from "../common/dnd"
import { useSortable } from "../common/dnd/useSortable"
import type { ItemsProps } from "./card"
import { CardWrapper } from "./card"
import { compactReaderQuery } from "~/utils"
import { currentColumnIDAtom, currentSourcesAtom } from "~/atoms"
import { primitiveMetadataAtom } from "~/atoms/primitiveMetadataAtom"
import { customSourceMapAtom } from "~/hooks/useCustomSources"
import { useSourceOverrides } from "~/hooks/useSourceOverrides"
import { useSourceCategories } from "~/hooks/useSourceCategories"

const AnimationDuration = 200
const lastSource = new Map<FixedColumnID, SourceID>()

export function Dnd() {
  const [items] = useAtom(currentSourcesAtom)
  const setMetadata = useSetAtom(primitiveMetadataAtom)
  const manualOrderByColumn = useAtomValue(primitiveMetadataAtom).manualOrderByColumn
  const currentColumnID = useAtomValue(currentColumnIDAtom)
  const customSourceIds = useCustomSourceIds(currentColumnID)
  const { hiddenSourceIds } = useSourceOverrides()
  // 初始化動態源 metadata map（供 card.tsx 渲染用）
  const customMap = useCustomSourceMap()

  const { data: catData, isError: isCatError } = useSourceCategories()

  const allItems = useMemo(() => {
    const manual = !!manualOrderByColumn?.[currentColumnID]

    if (catData) {
      if (currentColumnID === "focus") {
        return items as SourceID[]
      }
      const catList = catData.categories[currentColumnID as keyof typeof catData.categories] as SourceID[] | undefined
      if (!catList) return []
      if (!manual) {
        return catList as SourceID[]
      }
      const catSet = new Set(catList.map(String))
      const userOrdered = items.filter(id => catSet.has(String(id)))
      const userSet = new Set(userOrdered.map(String))
      const newItems = catList.filter(id => !userSet.has(String(id)))
      return [...userOrdered, ...newItems] as SourceID[]
    }

    if (currentColumnID === "focus") return items as SourceID[]

    // Fallback when backend is unavailable or error
    if (isCatError) {
      if (currentColumnID === "more" || currentColumnID === "news") {
        const allStatic = Object.keys(sources)
        const dynIds = customSourceIds
        const hiddenSet = new Set(hiddenSourceIds)
        return [...allStatic, ...dynIds].filter(id => !hiddenSet.has(id)) as SourceID[]
      }
      const staticSet = new Set(items as string[])
      const dynamicIds = customSourceIds.filter(id => !staticSet.has(id))
      const hiddenSet = new Set(hiddenSourceIds)
      return [...items, ...dynamicIds].filter(id => !hiddenSet.has(id)) as SourceID[]
    }

    return []
  }, [catData, isCatError, currentColumnID, items, customSourceIds, hiddenSourceIds, manualOrderByColumn])

  const [parent] = useAutoAnimate({ duration: AnimationDuration })
  const { batchReady, waitingForBatch } = useEntireQuery(allItems)
  const compact = useMedia(compactReaderQuery)
  const rail = useRef<HTMLOListElement>(null)
  const setRail = useCallback((node: HTMLOListElement | null) => {
    rail.current = node
    parent(compact ? null : node)
  }, [compact, parent])
  const railWidth = useRef(0)
  const [position, setPosition] = useState(0)
  const [announcement, announce] = useState("")
  const index = Math.max(0, Math.min(position, allItems.length - 1))
  const activeId = allItems[index]
  const nameOf = (id: SourceID) => catData?.metadata?.[id]?.name || sources[id]?.name || customMap[id]?.name || id

  const saveOrder = useCallback((order: SourceID[]) => {
    setMetadata(prev => ({
      ...prev,
      updatedTime: Date.now(),
      action: "manual",
      manualOrderByColumn: currentColumnID === "focus"
        ? prev.manualOrderByColumn
        : { ...prev.manualOrderByColumn, [currentColumnID]: true },
      data: { ...prev.data, [currentColumnID]: order },
    }))
  }, [currentColumnID, setMetadata])

  const goTo = useCallback((nextIndex: number) => {
    const list = rail.current
    const card = list?.children[nextIndex] as HTMLElement | undefined
    if (list && card) list.scrollLeft = card.offsetLeft - (list.children[0] as HTMLElement).offsetLeft
  }, [])

  useLayoutEffect(() => {
    if (!compact || !allItems.length) return
    const list = rail.current
    if (!list) return
    const align = () => {
      railWidth.current = list.clientWidth
      const saved = lastSource.get(currentColumnID)
      const next = saved ? Math.max(0, allItems.indexOf(saved)) : 0
      goTo(next)
      setPosition(next)
    }
    align()
    const observer = new ResizeObserver(() => {
      if (railWidth.current !== list.clientWidth) align()
    })
    observer.observe(list)
    return () => observer.disconnect()
  }, [compact, allItems, currentColumnID, goTo])

  const move = (from: number, direction: number) => {
    const to = from + direction
    if (to < 0 || to >= allItems.length) return
    const order = [...allItems]
    const [moved] = order.splice(from, 1)
    order.splice(to, 0, moved)
    if (compact) lastSource.set(currentColumnID, moved)
    saveOrder(order)
    announce(`${nameOf(moved)}已移至第 ${to + 1} 位，共 ${order.length} 个来源`)
    requestAnimationFrame(() => {
      if (compact) goTo(to)
      document.getElementById(`order-${moved}`)?.focus({ preventScroll: true })
    })
  }

  if (!allItems.length) {
    return (
      <div className="py-16 px-4 text-center text-sm text-neutral-400" role="status">
        {currentColumnID === "focus" ? (
          <>
            <p className="text-base text-neutral-200 mb-2">还没有关注的来源</p>
            <p>在新闻来源卡片上点击星标，即可在这里查看。</p>
            <Link to="/c/$column" params={{ column: "hottest" }} className="inline-block mt-4 text-red-300 hover:text-red-200 underline underline-offset-4">浏览热门来源</Link>
          </>
        ) : catData || isCatError ? "这个分类暂时没有内容。" : "正在加载来源…"}
      </div>
    )
  }

  return (
    <DndWrapper items={allItems} onReorder={saveOrder} isSingleColumn={compact}>
      {compact && allItems.length > 1 && (
        <nav aria-label="切换新闻来源" className="source-switcher flex items-center justify-between gap-3 px-3 mb-2">
          <div className="min-w-0 flex items-baseline gap-2 text-sm" aria-live="polite" aria-atomic="true">
            <span className="truncate font-medium text-neutral-200">{nameOf(activeId)}</span>
            <span className="shrink-0 text-xs text-neutral-400 tabular-nums">{index + 1} / {allItems.length}</span>
          </div>
          <div className="flex gap-1">
            {([-1, 1] as const).map(step => (
              <button key={step} type="button" aria-label={step === -1 ? "上一个来源" : "下一个来源"}
                disabled={index + step < 0 || index + step >= allItems.length}
                onClick={() => goTo(index + step)}
                className="grid h-11 w-11 place-items-center rounded-lg border border-white/12 text-neutral-200 hover:bg-white/5 disabled:opacity-35"
              >
                <span className={step === -1 ? "i-ph:caret-left-bold" : "i-ph:caret-right-bold"} aria-hidden="true" />
              </button>
            ))}
          </div>
        </nav>
      )}
      <ol
        ref={setRail}
        className={compact ? "news-source-rail relative flex overflow-x-auto snap-x snap-mandatory gap-3" : "grid gap-5"}
        style={compact ? undefined : { gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))" }}
        onScroll={compact ? event => {
          const list = event.currentTarget
          if (list.children.length < 2 || list.clientWidth !== railWidth.current) return
          const stride = (list.children[1] as HTMLElement).offsetLeft - (list.children[0] as HTMLElement).offsetLeft
          if (stride > 0) {
            const next = Math.max(0, Math.min(allItems.length - 1, Math.round(list.scrollLeft / stride)))
            lastSource.set(currentColumnID, allItems[next])
            setPosition(next)
          }
        } : undefined}
      >
        {allItems.map((id, i) => (
          <li key={id} className={compact ? "w-full shrink-0 snap-center" : "min-w-0"}>
            <SortableCardWrapper id={id} readerColumn={compact ? currentColumnID : undefined}
              waitForBatch={waitingForBatch}
              deferRender={!compact && i >= 6}
              prepare={compact && (i === index || (batchReady && Math.abs(i - index) === 1))} order={{ first: i === 0, last: i === allItems.length - 1, move: step => move(i, step) }} />
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status">{announcement}</p>
    </DndWrapper>
  )
}

function DndWrapper({ items, onReorder, isSingleColumn, children }: PropsWithChildren<{
  items: SourceID[]
  onReorder: (order: SourceID[]) => void
  isSingleColumn: boolean
}>) {
  const onDropTargetChange = useCallback(({ location, source }: BaseEventPayload<ElementDragType>) => {
    const traget = location.current.dropTargets[0]
    if (!traget?.data || !source?.data) return
    const closestEdgeOfTarget = extractClosestEdge(traget.data)
    const fromIndex = items.indexOf(source.data.id as SourceID)
    const toIndex = items.indexOf(traget.data.id as SourceID)
    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return
    const update = reorderWithEdge({
      list: items,
      startIndex: fromIndex,
      indexOfTarget: toIndex,
      closestEdgeOfTarget,
      axis: isSingleColumn ? "horizontal" : "vertical",
    })
    onReorder(update)
  }, [items, onReorder, isSingleColumn])
  // 避免动画干扰
  const { run } = useThrottleFn(onDropTargetChange, {
    leading: true,
    trailing: true,
    wait: AnimationDuration,
  })
  const { el } = useAtomValue(goToTopAtom)
  return (
    <DndContext onDropTargetChange={run} autoscroll={el ? { element: el } : undefined}>
      {children}
    </DndContext>
  )
}

function CardOverlay({ id }: { id: SourceID }) {
  const customMap = useAtomValue(customSourceMapAtom)
  const staticSource = sources[id]
  const customSource = customMap[id as string]
  const name = staticSource?.name || customSource?.name || id
  const iconUrl = staticSource
    ? `/icons/${(id as string).split("-")[0]}.png`
    : (customSource ? `https://${customSource.subdomain}.buzzing.cc/icon.png` : undefined)

  return (
    <div className={$(
      "flex flex-col p-4 backdrop-blur-5",
      "bg-white/[0.06] border border-white/[0.1]",
      !isiOS() && "rounded-xl",
    )}
    >
      <div className="flex justify-between mx-2 items-center">
        <div className="flex gap-2.5 items-center">
          <div
            className="w-7 h-7 rounded-full bg-cover bg-center border border-white/8"
            style={{
              backgroundImage: iconUrl ? `url(${iconUrl})` : undefined,
            }}
          />
          <span className="flex flex-col">
            <span className="text-base font-medium op-80">{name}</span>
            <span className="text-[10px] op-30">拖拽中</span>
          </span>
        </div>
        <div className="flex gap-2 text-sm op-40">
          <button
            type="button"
            className="i-ph:dots-six-vertical cursor-grabbing"
          />
        </div>
      </div>
    </div>
  )
}

function SortableCardWrapper({ id, order, readerColumn, prepare, waitForBatch, deferRender }: ItemsProps) {
  const {
    isDragging,
    setNodeRef,
    setHandleRef,
    OverlayContainer,
  } = useSortable({ id })

  useEffect(() => {
    if (OverlayContainer) {
      OverlayContainer!.className += $(`bg-base`, !isiOS() && "rounded-2xl")
    }
  }, [OverlayContainer])

  return (
    <>
      <CardWrapper
        ref={setNodeRef}
        id={id}
        order={order}
        readerColumn={readerColumn}
        prepare={prepare}
        waitForBatch={waitForBatch}
        deferRender={deferRender}
        isDragging={isDragging}
        setHandleRef={setHandleRef}
      />
      {OverlayContainer && createPortal(<CardOverlay id={id} />, OverlayContainer)}
    </>
  )
}
