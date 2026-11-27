import { safeStorage } from "@shared/storage"
import type { PrimitiveAtom } from "jotai"
import type { FixedColumnID, PrimitiveMetadata, SourceID } from "@shared/types"
import type { Update } from "./types"

export const syncAccountAtom = atom<string | null>(null)

function createPrimitiveMetadataAtom(
  key: string,
  initialValue: PrimitiveMetadata,
  preprocess: ((stored: PrimitiveMetadata) => PrimitiveMetadata),
): PrimitiveAtom<PrimitiveMetadata> {
  const getInitialValue = (): PrimitiveMetadata => {
    const item = safeStorage.getItem(key)
    try {
      if (item) {
        const stored = JSON.parse(item) as PrimitiveMetadata
        verifyPrimitiveMetadata(stored)
        return preprocess({
          ...stored,
          action: "init",
        })
      }
    } catch { }
    return initialValue
  }
  const baseAtom = atom(getInitialValue())
  const derivedAtom = atom(get => get(baseAtom), (get, set, update: Update<PrimitiveMetadata>) => {
    let current = get(baseAtom)
    // Another tab can save a newer edit while this tab awaits an upload response.
    const stored = getInitialValue()
    if (stored.updatedTime > current.updatedTime) {
      current = stored
      set(baseAtom, current)
    }
    let nextValue = update instanceof Function ? update(current) : update
    if (nextValue === current) return
    if (nextValue.action === "manual") {
      nextValue = {
        ...nextValue,
        updatedTime: Math.max(current.updatedTime + 1, nextValue.updatedTime),
        pendingSyncFor: get(syncAccountAtom) ?? current.pendingSyncFor ?? null,
      }
    }
    const acknowledged = current.pendingSyncFor !== undefined && nextValue.pendingSyncFor === undefined
      && nextValue.updatedTime === current.updatedTime && nextValue.action === "sync"
    if (nextValue.updatedTime > current.updatedTime || acknowledged) {
      set(baseAtom, nextValue)
      safeStorage.setItem(key, JSON.stringify(nextValue))
    }
  })
  return derivedAtom
}

const initialMetadata = typeSafeObjectFromEntries(typeSafeObjectEntries(metadata)
  .filter(([id]) => fixedColumnIds.includes(id as any))
  .map(([id, val]) => [id, val.sources] as [FixedColumnID, SourceID[]]))
export function preprocessMetadata(target: PrimitiveMetadata) {
  return {
    data: {
      ...initialMetadata,
      ...typeSafeObjectFromEntries(
        typeSafeObjectEntries(target.data)
          .filter(([id]) => initialMetadata[id])
          .map(([id, s]) => {
            if (id === "focus") return [id, [...new Set(s.map(k => sources[k]?.redirect ?? k))]]
            // 保留使用者排序：靜態源做 redirect 映射，動態源原樣保留
            const oldS = s.map(k => {
              if (sources[k]) return sources[k].redirect ?? k  // 靜態源：套用 redirect
              if (initialMetadata[id]?.includes(k)) return k   // 在初始列表中的
              return k                                          // 動態源：原樣保留
            })
            const newS = initialMetadata[id].filter(k => !oldS.includes(k))
            return [id, [...oldS, ...newS]]
          }),
      ),
    },
    pendingSyncFor: target.pendingSyncFor,
    manualOrderByColumn: target.manualOrderByColumn ?? {},
    action: target.action,
    updatedTime: target.updatedTime,
  } as PrimitiveMetadata
}

export const primitiveMetadataAtom = createPrimitiveMetadataAtom("metadata", {
  updatedTime: 0,
  data: initialMetadata,
  action: "init",
  manualOrderByColumn: {},
}, preprocessMetadata)
