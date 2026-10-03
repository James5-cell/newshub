import { validateFeedURL } from "./feed-url"
// Bound downloaded bytes before XML/JSON parsing, including chunked responses.
export async function fetchFeed(url: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  const timer = setTimeout(abort, 10_000)
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    let target = validateFeedURL(url)
    let response: Response | undefined
    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(target, { signal: controller.signal, redirect: "manual", headers: { "User-Agent": "NewsHub RSS Reader" } })
      if (![301, 302, 303, 307, 308].includes(response.status)) break
      await response.body?.cancel()
      const location = response.headers.get("location")
      if (!location) throw new Error("Feed redirect has no location")
      target = validateFeedURL(new URL(location, target).href)
      response = undefined
    }
    if (!response) throw new Error("Too many feed redirects")
    if (response.headers.get("cf-mitigated") === "challenge") {
      throw new Error(`Feed blocked by upstream Cloudflare challenge (HTTP ${response.status}); RSS content was not received`)
    }
    if (!response.ok) throw new Error(`Feed request failed: ${response.status}`)
    if (Number(response.headers.get("content-length")) > 512 * 1024) throw new Error("Feed exceeds size limit")
    if (!response.body) throw new Error("Feed response is empty")
    reader = response.body.getReader()
    const decoder = new TextDecoder()
    let size = 0
    let text = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 512 * 1024) throw new Error("Feed exceeds size limit")
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    await reader?.cancel().catch(() => {})
    clearTimeout(timer)
    signal?.removeEventListener("abort", abort)
    controller.abort()
  }
}
