import type { SourceID } from "@shared/types"
import { focusSourcesAtom } from "~/atoms"

export function useFocus() {
  const [focusSources, setFocusSources] = useAtom(focusSourcesAtom)
  const toggleFocus = useCallback((id: SourceID) => {
    const remove = focusSources.includes(id)
    setFocusSources(current => remove ? current.filter(source => source !== id) : [...new Set([...current, id])])
  }, [setFocusSources, focusSources])
  const isFocused = useCallback((id: SourceID) => focusSources.includes(id), [focusSources])

  return {
    toggleFocus,
    isFocused,
  }
}

export function useFocusWith(id: SourceID) {
  const { toggleFocus, isFocused } = useFocus()
  return {
    toggleFocus: useCallback(() => toggleFocus(id), [id, toggleFocus]),
    isFocused: isFocused(id),
  }
}
