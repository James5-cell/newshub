import { MascotEngine } from "../src/mascot/engine"

describe("newsNow mascot input decoder", () => {
  it("turns a single tap into the shared click response and wake state", () => {
    const engine = new MascotEngine(null, 0, () => 0.99)
    engine.tick(100, [{ type: "tap", at: 100, anchorX: 50 }], false)
    engine.tick(420, [], false)

    expect(engine.snapshot().mode).toBe("companion")
    expect(engine.snapshot().behavior).toBe("click_react")
  })

  it("decodes double and triple taps as distinct priority reactions", () => {
    const doubleTap = new MascotEngine(null, 0, () => 0.99)
    doubleTap.tick(100, [{ type: "tap", at: 100, anchorX: 50 }], false)
    doubleTap.tick(200, [{ type: "tap", at: 200, anchorX: 50 }], false)
    doubleTap.tick(520, [], false)
    expect(doubleTap.snapshot().mode).toBe("shock")
    expect(doubleTap.snapshot().behavior).toBe("flinch")

    const tripleTap = new MascotEngine(null, 0, () => 0.99)
    tripleTap.tick(100, [{ type: "tap", at: 100, anchorX: 50 }], false)
    tripleTap.tick(200, [{ type: "tap", at: 200, anchorX: 50 }], false)
    tripleTap.tick(300, [{ type: "tap", at: 300, anchorX: 50 }], false)
    expect(tripleTap.snapshot().mode).toBe("shy")
    expect(tripleTap.snapshot().behavior).toBe("blush")
  })

  it("keeps the signal scan as an idle-gated, site-specific antic", () => {
    const engine = new MascotEngine(null, 0, () => 0.1)
    let sawScan = false
    for (let now = 100; now <= 45_000; now += 100) {
      engine.tick(now, [], false)
      if (engine.snapshot().behavior === "signal_scan") sawScan = true
    }

    expect(sawScan).toBe(true)
  })
})
