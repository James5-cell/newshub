import { fixedColumnIds, metadata } from "@shared/metadata"
import { Link } from "@tanstack/react-router"
import { currentColumnIDAtom } from "~/atoms"

export function NavBar() {
  const currentId = useAtomValue(currentColumnIDAtom)
  return (
    <span className={$([
      "flex p-1 rounded-lg text-sm gap-0.5",
      "bg-white/[0.04] border border-white/[0.08]",
    ])}
    >
      {fixedColumnIds.map(columnId => (
        <Link
          key={columnId}
          to="/c/$column"
          params={{ column: columnId }}
          className={$(
            "px-3 py-1 rounded-md cursor-pointer transition-all duration-200",
            currentId === columnId
              ? "bg-white/[0.1] text-white/90 font-medium"
              : "text-white/50 hover:text-white/75 hover:bg-white/[0.05]",
          )}
        >
          {metadata[columnId].name}
        </Link>
      ))}
    </span>
  )
}
