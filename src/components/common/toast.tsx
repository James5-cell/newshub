import { useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useMount } from "react-use"
import type { ToastItem } from "~/atoms/types"
import { Timer } from "~/utils"

export function Toast() {
  const toastItems = useAtomValue(toastAtom)

  return (
    <ul
      className="fixed bottom-6 right-6 z-99 flex flex-col-reverse gap-2.5 max-w-[360px] w-[calc(100vw-32px)] sm:w-[360px] pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toastItems.map(item => (
          <Item key={item.id} info={item} />
        ))}
      </AnimatePresence>
    </ul>
  )
}

const typeStyles = {
  success: {
    icon: "i-ph:check-circle-duotone text-emerald-400",
    border: "border-emerald-500/25 bg-emerald-950/30",
    accent: "bg-emerald-500",
  },
  error: {
    icon: "i-ph:warning-circle-duotone text-red-400",
    border: "border-red-500/25 bg-red-950/30",
    accent: "bg-red-500",
  },
  warning: {
    icon: "i-ph:warning-duotone text-amber-400",
    border: "border-amber-500/25 bg-amber-950/30",
    accent: "bg-amber-500",
  },
  info: {
    icon: "i-ph:info-duotone text-sky-400",
    border: "border-white/10 bg-[#1A1A1A]/95",
    accent: "bg-sky-500",
  },
}

function Item({ info }: { info: ToastItem }) {
  const type = info.type ?? "info"
  const style = typeStyles[type]
  const setToastItems = useSetAtom(toastAtom)
  
  const hidden = useCallback((dismiss = true) => {
    setToastItems(prev => prev.filter(k => k.id !== info.id))
    if (dismiss) {
      info.onDismiss?.()
    }
  }, [info, setToastItems])

  const timer = useRef<Timer | undefined>(undefined)

  useMount(() => {
    timer.current = new Timer(() => {
      hidden()
    }, info.duration ?? 4000)
    return () => timer.current?.clear()
  })

  const [hovered, setHovered] = useState(false)
  useEffect(() => {
    if (hovered) {
      timer.current?.pause()
    } else {
      timer.current?.resume()
    }
  }, [hovered])

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={$([
        "pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl shadow-black/80 p-3.5",
        "flex items-center gap-3 text-sm text-neutral-200 font-medium",
        style.border,
      ])}
    >
      {/* Type Icon */}
      <span className={$(style.icon, "text-xl flex-shrink-0")} />

      {/* Message Content */}
      <div className="flex-1 flex items-center justify-between gap-2 overflow-hidden">
        <span className="leading-snug text-xs sm:text-sm text-neutral-200">
          {info.msg}
        </span>

        {info.action && (
          <button
            type="button"
            className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            onClick={info.action.onClick}
          >
            {info.action.label}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        title="关闭"
        className="flex-shrink-0 text-neutral-500 hover:text-white transition-colors p-0.5 rounded-md"
        onClick={() => hidden(false)}
      >
        <span className="i-ph:x text-base block" />
      </button>
    </motion.li>
  )
}
