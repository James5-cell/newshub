import type { PropsWithChildren } from "react"
import type { FixedColumnID, PrimitiveMetadata } from "@shared/types"
import type { SourceID } from "@shared/types"
import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { createPortal } from "react-dom"
import { useThrottleFn } from "ahooks"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { motion } from "framer-motion"
import { useWindowSize } from "react-use"
import { isMobile } from "react-device-detect"
import { DndContext } from "../common/dnd"
import { useSortable } from "../common/dnd/useSortable"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import type { ItemsProps } from "./card"
import { CardWrapper } from "./card"
import { currentColumnIDAtom, currentSourcesAtom } from "~/atoms"
import { primitiveMetadataAtom } from "~/atoms/primitiveMetadataAtom"
import { customSourceMapAtom } from "~/hooks/useCustomSources"
import { sources } from "@shared/sources"
import { useSourceOverrides } from "~/hooks/useSourceOverrides"
import { useSourceCategories } from "~/hooks/useSourceCategories"

const AnimationDuration = 200
const WIDTH = 350

function sameStringArrayOrder(a: string[] | undefined, b: string[] | undefined) {
  if (!a?.length || !b?.length || a.length !== b.length) return false
  return a.every((id, i) => String(id) === String(b[i]))
}

export function Dnd() {
  const [items] = useAtom(currentSourcesAtom)
  const setMetadata = useSetAtom(primitiveMetadataAtom)
  const manualOrderByColumn = useAtomValue(primitiveMetadataAtom).manualOrderByColumn ?? {}
  const currentColumnID = useAtomValue(currentColumnIDAtom)
  const customSourceIds = useCustomSourceIds(currentColumnID)
  const { hiddenSourceIds } = useSourceOverrides()
  // 初始化動態源 metadata map（供 card.tsx 渲染用）
  useCustomSourceMap()

  const { data: catData, isError: isCatError } = useSourceCategories()

  // 未手動拖曳的分頁：本機 data 與站方 GET /source-categories 排序對齊（Admin 改權重後訪客會拿到最新順序）
  useEffect(() => {
    if (!catData || isCatError || currentColumnID === "focus") return
    if (manualOrderByColumn[currentColumnID]) return
    const catList = catData.categories[currentColumnID as keyof typeof catData.categories]
    if (!catList?.length) return
    setMetadata((prev) => {
      const cur = prev.data[currentColumnID] as SourceID[]
      if (sameStringArrayOrder(cur as string[], catList as string[])) return prev
      return {
        ...prev,
        updatedTime: Date.now(),
        action: "sync",
        data: {
          ...prev.data,
          [currentColumnID]: catList as SourceID[],
        },
      }
    })
  }, [catData, isCatError, currentColumnID, manualOrderByColumn[currentColumnID], setMetadata])

  const allItems = useMemo(() => {
    const manual = !!manualOrderByColumn[currentColumnID]

    if (catData && !isCatError) {
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
  useEntireQuery(allItems)
  const { width } = useWindowSize()
  const minWidth = useMemo(() => {
    // double padding = 32
    return Math.min(width - 32, WIDTH)
  }, [width])

  if (!allItems.length) return null

  return (
    <DndWrapper items={allItems} setMetadata={setMetadata} columnId={currentColumnID} isSingleColumn={isMobile}>
      <OverlayScrollbar defer className="overflow-x-auto">
        <motion.ol
          className={isMobile
            ? "flex px-2 gap-5 pb-4 scroll-smooth"
            : "grid w-full gap-5"}
          ref={parent}
          style={isMobile
            ? {
                // 横向滚动布局
              }
            : {
                gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
              }}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {
              opacity: 0,
            },
            visible: {
              opacity: 1,
              transition: {
                delayChildren: 0.1,
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {allItems.map((id, index) => (
            <motion.li
              key={id}
              className={$(isMobile && "flex-shrink-0", isMobile && index === allItems.length - 1 && "mr-2")}
              style={isMobile ? { width: `${width - 16 > WIDTH ? WIDTH : width - 16}px` } : undefined}
              transition={{
                type: "tween",
                duration: AnimationDuration / 1000,
              }}
              variants={{
                hidden: {
                  y: 20,
                  opacity: 0,
                },
                visible: {
                  y: 0,
                  opacity: 1,
                },
              }}
            >
              <SortableCardWrapper id={id} />
            </motion.li>
          ))}
        </motion.ol>
      </OverlayScrollbar>
      {isMobile && (
        <div className="flex justify-center">
          <span className="text-sm text-gray-500 text-center">左右滑动查看更多</span>
        </div>
      )}
    </DndWrapper>
  )
}

function DndWrapper({ items, setMetadata, columnId, isSingleColumn, children }: PropsWithChildren<{
  items: SourceID[]
  setMetadata: (update: PrimitiveMetadata | ((prev: PrimitiveMetadata) => PrimitiveMetadata)) => void
  columnId: FixedColumnID
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
    setMetadata((prev) => ({
      ...prev,
      updatedTime: Date.now(),
      action: "manual",
      manualOrderByColumn: columnId !== "focus"
        ? { ...prev.manualOrderByColumn, [columnId]: true }
        : prev.manualOrderByColumn,
      data: {
        ...prev.data,
        [columnId]: update,
      },
    }))
  }, [items, setMetadata, isSingleColumn, columnId])
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

function SortableCardWrapper({ id }: ItemsProps) {
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
        isDragging={isDragging}
        setHandleRef={setHandleRef}
      />
      {OverlayContainer && createPortal(<CardOverlay id={id} />, OverlayContainer)}
    </>
  )
}
