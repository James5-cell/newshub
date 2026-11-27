import { safeStorage } from "@shared/storage"
import { atomWithStorage, createJSONStorage } from "jotai/utils"
import { useMedia } from "react-use"
import { compactReaderQuery } from "~/utils"

const preference = atomWithStorage<boolean | null>(
  "newshub-mascot-hidden",
  null,
  createJSONStorage(() => safeStorage),
  { getOnInit: true },
)

export function useMascotVisibility() {
  const compact = useMedia(compactReaderQuery)
  const [hidden, setHidden] = useAtom(preference)
  return [hidden ?? compact, setHidden] as const
}
