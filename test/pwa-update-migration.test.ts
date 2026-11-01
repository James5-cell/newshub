import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"

const script = readFileSync(new URL("../public/pwa-update-migration.js", import.meta.url), "utf8")

function createWorker(hasOldWorker: boolean) {
  const entries = new Map<string, string>()
  const handlers = new Map<string, (event: { waitUntil: (promise: Promise<void>) => void }) => void>()
  const navigate = vi.fn().mockResolvedValue(undefined)
  const cache = {
    match: async (key: string) => entries.has(key) ? new Response(entries.get(key)) : undefined,
    put: async (key: string, value: Response) => { entries.set(key, await value.text()) },
  }
  const worker = {
    registration: { scope: "https://example.test/", active: hasOldWorker ? {} : null },
    clients: { matchAll: vi.fn().mockResolvedValue([{ url: "https://example.test/c/news", navigate }]) },
    addEventListener: (name: string, handler: (event: { waitUntil: (promise: Promise<void>) => void }) => void) => handlers.set(name, handler),
  }
  runInNewContext(script, { self: worker, caches: { open: async () => cache }, URL, Response, console })
  const dispatch = async (name: string) => {
    let task: Promise<void> | undefined
    handlers.get(name)!({ waitUntil: promise => { task = promise } })
    await task
  }
  return { dispatch, navigate }
}

describe("pwa update migration", () => {
  it("reloads an open older client once", async () => {
    const worker = createWorker(true)
    await worker.dispatch("install")
    await worker.dispatch("activate")
    expect(worker.navigate).toHaveBeenCalledOnce()
    expect(worker.navigate).toHaveBeenCalledWith("https://example.test/c/news")
    await worker.dispatch("install")
    await worker.dispatch("activate")
    expect(worker.navigate).toHaveBeenCalledOnce()
  })

  it("does not reload a first-time visitor", async () => {
    const worker = createWorker(false)
    await worker.dispatch("install")
    await worker.dispatch("activate")
    expect(worker.navigate).not.toHaveBeenCalled()
  })
})
