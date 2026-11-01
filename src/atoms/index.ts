import type { FixedColumnID, SourceID } from "@shared/types"
import { safeStorage } from "@shared/storage"
import type { Update } from "./types"

const mascotVisibilityStorageKey = "newshub-mascot-hidden"
const mascotHiddenStateAtom = atom(safeStorage.getItem(mascotVisibilityStorageKey) === "true")
export const mascotHiddenAtom = atom(
  get => get(mascotHiddenStateAtom),
  (_get, set, hidden: boolean) => {
    safeStorage.setItem(mascotVisibilityStorageKey, String(hidden))
    set(mascotHiddenStateAtom, hidden)
  },
)

export const focusSourcesAtom = atom((get) => {
  return get(primitiveMetadataAtom).data.focus
}, (get, set, update: Update<SourceID[]>) => {
  const _ = update instanceof Function ? update(get(focusSourcesAtom)) : update
  const prev = get(primitiveMetadataAtom)
  set(primitiveMetadataAtom, {
    ...prev,
    updatedTime: Date.now(),
    action: "manual",
    data: {
      ...prev.data,
      focus: _,
    },
  })
})

export const currentColumnIDAtom = atom<FixedColumnID>("focus")

export const currentSourcesAtom = atom((get) => {
  const id = get(currentColumnIDAtom)
  return get(primitiveMetadataAtom).data[id]
}, (get, set, update: Update<SourceID[]>) => {
  const _ = update instanceof Function ? update(get(currentSourcesAtom)) : update
  const prev = get(primitiveMetadataAtom)
  set(primitiveMetadataAtom, {
    ...prev,
    updatedTime: Date.now(),
    action: "manual",
    data: {
      ...prev.data,
      [get(currentColumnIDAtom)]: _,
    },
  })
})

export const goToTopAtom = atom({
  ok: false,
  el: undefined as HTMLElement | undefined,
  fn: undefined as (() => void) | undefined,
})
