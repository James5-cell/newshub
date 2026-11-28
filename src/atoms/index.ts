import type { FixedColumnID, SourceID } from "@shared/types"
import type { Update } from "./types"

export const focusSourcesAtom = atom((get) => {
  return get(primitiveMetadataAtom).data.focus
}, (_get, set, update: Update<SourceID[]>) => {
  set(primitiveMetadataAtom, prev => ({
    ...prev,
    updatedTime: Date.now(),
    action: "manual",
    data: {
      ...prev.data,
      focus: typeof update === "function" ? update(prev.data.focus) : update,
    },
  }))
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

const narrowViewportQuery = "(max-width: 767px)"

export const narrowViewportAtom = atom(
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(narrowViewportQuery).matches
    : false,
)

narrowViewportAtom.onMount = (set) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
  const mq = window.matchMedia(narrowViewportQuery)
  const update = () => set(mq.matches)
  update()
  mq.addEventListener("change", update)
  return () => mq.removeEventListener("change", update)
}
