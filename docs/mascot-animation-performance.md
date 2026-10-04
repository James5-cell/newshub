# NewsNow mascot animation performance · 2026-10-04

Canonical body, sprout, double eyes, shared stage sizes, skin anchors and interaction cadence preserved. News signal keeps its 1100ms receiving pulse (0.92–1.12 scale) and paper actions unchanged.

- Two tightly cropped HTML eye transform layers contain static SVG eye artwork (same 5.2s cadence/120ms phase, geometry and theme). Small body/sprout/signal/eye layer hints only; layout/style containment does not clip accessories. Existing shadow/blush visuals retained.
- Pointer proximity layout reads sampled 100ms. Background stops the scheduler; offscreen/guarded/shy_wait CSS loops pause, including signal pulse. Foreground recovery remains alive to avoid a hiding deadlock. All added observers/listeners disposed on unmount.
- Shy phases exclusively own recovery so generic action completion cannot undo hiding mid-transition; regression includes intermediate ticks.
- Source PNGs unchanged. Transparent WebP display derivatives: plate 396px, sprout 64px, paper 176px, signal 112px (>3x displayed dimensions). Lossless encoding follows resizing, not original-resolution pixel identity.
- GPU-process CPU reduction is not measured or guaranteed.

## Verification

- `npm run typecheck`: passed after Nitro build generated server declarations.
- `npm test -- --run test/mascot.test.ts`: 4 tests passed.
- `npm run build`: passed (Vite and Nitro).
- `git diff --check`: passed.
- Activity Monitor / GPU utilization was not measured.
