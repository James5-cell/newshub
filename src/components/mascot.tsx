import { type CSSProperties, useEffect, useRef, useState } from "react"
import { mascotConfig } from "~/mascot.config"
import { MascotEngine, type MascotSignal, type MascotSnapshot } from "~/mascot/engine"
import "~/mascot/mascot.css"

const initialSnapshot: MascotSnapshot = {
  mode: "rest",
  behavior: null,
  xPercent: mascotConfig.motion.startHorizontalPercent,
  transitionMs: 700,
  actionMs: 0,
  drives: { ...mascotConfig.drives.defaults },
}

function isEditing(target: Element | null) {
  return Boolean(target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"))
}

export function NewsNowMascot() {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const signalsRef = useRef<MascotSignal[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let storage: Storage | null = null
    try { storage = window.localStorage } catch { /* Storage is optional. */ }
    const engine = new MascotEngine(storage, Date.now())
    setSnapshot(engine.snapshot())
    engine.consumeChanged()

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const readTheme = () => {
      const next = document.documentElement.classList.contains("dark") ? "dark" : "light"
      setTheme((previous) => {
        if (previous !== next) signalsRef.current.push({ type: "theme" })
        return next
      })
    }
    readTheme()
    const themeObserver = new MutationObserver(readTheme)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })

    let lastScrollPosition = window.scrollY
    const onScroll = (event: Event) => {
      const target = event.target
      const next = target instanceof Element ? target.scrollTop : window.scrollY
      if (Math.abs(next - lastScrollPosition) >= mascotConfig.scheduler.scrollThresholdPx) {
        signalsRef.current.push({ type: "scroll" })
        lastScrollPosition = next
      }
    }
    let lastPointer = { x: 0, y: 0, at: 0 }
    let lastPointerActivityAt = 0
    const onPointerMove = (event: PointerEvent) => {
      const now = Date.now()
      const current = { x: event.clientX, y: event.clientY, at: now }
      if (now - lastPointerActivityAt >= 1_000) {
        signalsRef.current.push({ type: "pointer_activity", near: false })
        lastPointerActivityAt = now
      }
      const elapsed = now - lastPointer.at
      if (lastPointer.at && elapsed > 0) {
        const speed = Math.hypot(current.x - lastPointer.x, current.y - lastPointer.y) / elapsed * 1_000
        const box = buttonRef.current?.getBoundingClientRect()
        const distance = box
          ? Math.hypot(current.x - (box.left + box.width / 2), current.y - (box.top + box.height / 2))
          : Number.POSITIVE_INFINITY
        if (speed >= mascotConfig.scheduler.rapidPointerSpeedPxPerSecond && distance < mascotConfig.scheduler.nearbyRadiusPx)
          signalsRef.current.push({ type: "nearby" })
      }
      lastPointer = current
    }
    const onVisibility = () => signalsRef.current.push({ type: "document_hidden", value: document.hidden })
    const onFullscreen = () => signalsRef.current.push({ type: "fullscreen", value: Boolean(document.fullscreenElement) })
    const onFocusIn = (event: FocusEvent) => signalsRef.current.push({ type: "busy", value: isEditing(event.target as Element) })
    const onFocusOut = (event: FocusEvent) => {
      if (isEditing(event.target as Element) && !isEditing(event.relatedTarget as Element))
        signalsRef.current.push({ type: "busy", value: false })
    }

    document.addEventListener("visibilitychange", onVisibility)
    document.addEventListener("fullscreenchange", onFullscreen)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("focusout", onFocusOut)
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    onVisibility()
    onFullscreen()
    signalsRef.current.push({ type: "busy", value: isEditing(document.activeElement) })

    const interval = window.setInterval(() => {
      engine.tick(Date.now(), signalsRef.current.splice(0), motionQuery.matches)
      if (engine.consumeChanged()) setSnapshot(engine.snapshot())
    }, mascotConfig.scheduler.tickMs)

    return () => {
      window.clearInterval(interval)
      themeObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      document.removeEventListener("fullscreenchange", onFullscreen)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("focusout", onFocusOut)
      document.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("pointermove", onPointerMove)
      signalsRef.current = []
    }
  }, [])

  const anchorX = () => {
    const box = buttonRef.current?.getBoundingClientRect()
    return box ? (box.left + box.width / 2) / window.innerWidth * 100 : snapshot.xPercent
  }
  const enqueue = (signal: MascotSignal) => signalsRef.current.push(signal)
  const plate = theme === "dark" ? mascotConfig.core.dark : mascotConfig.core.light
  const sprout = theme === "dark" ? mascotConfig.core.sprout.dark : mascotConfig.core.sprout.light
  const paper = theme === "dark" ? mascotConfig.slots.paper.dark : mascotConfig.slots.paper.light
  const signal = theme === "dark" ? mascotConfig.slots.signal.dark : mascotConfig.slots.signal.light
  const style = {
    left: "50%",
    bottom: mascotConfig.motion.companionBottom,
    "--news-x": `${snapshot.xPercent - 50}vw`,
    "--news-transition-ms": `${snapshot.transitionMs}ms`,
    "--news-action-ms": `${snapshot.actionMs}ms`,
  } as CSSProperties

  return (
    <aside aria-label="NewsNow mascot" className="news-mascot-dock" data-mode={snapshot.mode}
      data-behavior={snapshot.behavior ?? "idle"} data-theme={theme} style={style}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "transform")
          enqueue({ type: "transition_end" })
      }}>
      <button ref={buttonRef} type="button" className="news-mascot-button"
        aria-label="與 NewsNow 桌寵互動"
        onPointerEnter={() => enqueue({ type: "hover", anchorX: anchorX() })}
        onClick={() => enqueue({ type: "tap", at: Date.now(), anchorX: anchorX() })}>
        <span className="news-mascot-stage" aria-hidden="true">
          <span className="news-mascot-core">
            <img className="news-mascot-plate" src={plate} alt="" draggable={false} />
            <span className="news-mascot-sprout" style={{
              left: mascotConfig.core.sprout.left,
              top: mascotConfig.core.sprout.top,
              width: mascotConfig.core.sprout.displayWidth,
              height: mascotConfig.core.sprout.displayHeight,
              transformOrigin: mascotConfig.core.sprout.pivot,
            }}><img src={sprout} alt="" draggable={false} /></span>
            <span className="news-mascot-paper" style={{
              left: mascotConfig.slots.paper.left,
              top: mascotConfig.slots.paper.top,
              width: mascotConfig.slots.paper.width,
              zIndex: mascotConfig.slots.paper.zIndex,
              transformOrigin: mascotConfig.slots.paper.pivot,
            }} data-slot-click={mascotConfig.slots.paper.behavior.on_click}
              data-slot-shock={mascotConfig.slots.paper.behavior.on_shock}>
              <img src={paper} alt="" draggable={false} />
            </span>
            <span className="news-mascot-signal" style={{
              right: mascotConfig.slots.signal.right,
              top: mascotConfig.slots.signal.top,
              width: mascotConfig.slots.signal.width,
              zIndex: mascotConfig.slots.signal.zIndex,
              transformOrigin: mascotConfig.slots.signal.pivot,
              "--news-signal-pulse-ms": `${mascotConfig.slots.signal.behavior.pulseMs}ms`,
              "--news-signal-pulse-min": mascotConfig.slots.signal.behavior.pulseMin,
              "--news-signal-pulse-max": mascotConfig.slots.signal.behavior.pulseMax,
            } as CSSProperties} data-slot-click={mascotConfig.slots.signal.behavior.on_click}
              data-slot-shock={mascotConfig.slots.signal.behavior.on_shock}
              data-slot-antic={mascotConfig.slots.signal.behavior.on_antic}>
              <img src={signal} alt="" draggable={false} />
            </span>
            <svg className="news-mascot-eyes" viewBox={`0 0 ${mascotConfig.core.width} ${mascotConfig.core.height}`}>
              {mascotConfig.core.eyes.map((eye, index) => <g className="news-mascot-eye" key={index}
                style={{ transformOrigin: `${eye.x}px ${eye.y}px` }}>
                <circle className="news-mascot-eye-halo" cx={eye.x} cy={eye.y} r={eye.haloRadius} />
                <circle className="news-mascot-eye-moon" cx={eye.x} cy={eye.y} r={eye.moonRadius} />
              </g>)}
            </svg>
            <span className="news-mascot-cheek news-mascot-cheek-left" />
            <span className="news-mascot-cheek news-mascot-cheek-right" />
          </span>
        </span>
      </button>
    </aside>
  )
}
