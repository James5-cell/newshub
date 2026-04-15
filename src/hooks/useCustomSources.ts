import { useQuery } from "@tanstack/react-query"

/**
 * 動態源的前端表示型別
 * 與靜態 Source 介面對齊，但不受 SourceID union 約束
 */
export interface CustomSourceInfo {
  id: string
  name: string
  subdomain: string
  type?: string
  column: string
  color: string
  interval: number
  home: string
  title: string
}

/**
 * 從 /api/custom-sources 拉取所有 active 動態源
 * - staleTime 60s：避免頻繁呼叫，但仍能在 Admin 修改後較快刷新
 * - 首頁和導覽列可用此 hook 動態合併源清單
 */
export function useCustomSources() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["custom-sources"],
    queryFn: async () => {
      const res: CustomSourceInfo[] = await myFetch("/custom-sources")
      return res ?? []
    },
    staleTime: 1000 * 60,
    retry: 1,
  })

  return {
    customSources: data ?? [],
    isLoading,
    refetch,
  }
}

/**
 * 根據 column 或 type 篩選動態源 ID
 * 用於在 Dnd 列表中 append 對應的動態源
 */
export function useCustomSourceIds(columnOrType: string) {
  const { customSources } = useCustomSources()

  return useMemo(() => {
    return customSources
      .filter((s) => {
        // "hottest" / "realtime" tab → 匹配 type
        if (columnOrType === "hottest" || columnOrType === "realtime") {
          return s.type === columnOrType
        }
        // "focus" tab → 不自動 append（需使用者手動收藏）
        if (columnOrType === "focus") {
          return false
        }
        // 其他 column (china, world, tech, finance) → 匹配 column
        return s.column === columnOrType
      })
      .map(s => s.id)
  }, [customSources, columnOrType])
}

/**
 * 快取動態源的 metadata，供 card.tsx 渲染使用
 * key: sourceId (如 "buzzing-bbc")
 * value: CustomSourceInfo
 */
export const customSourceMapAtom = atom<Record<string, CustomSourceInfo>>({})

export function useCustomSourceMap() {
  const { customSources } = useCustomSources()
  const [map, setMap] = useAtom(customSourceMapAtom)

  useEffect(() => {
    if (customSources.length > 0) {
      const newMap: Record<string, CustomSourceInfo> = {}
      customSources.forEach((s) => {
        newMap[s.id] = s
      })
      setMap(newMap)
    }
  }, [customSources, setMap])

  return map
}
