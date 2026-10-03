import type { Database } from "db0"

const initialized = new WeakMap<object, Set<string>>()

// Remember completed migrations only; do not share pending database I/O across
// Cloudflare requests. A failed initialization is retried on the next request.
export async function initializeTable(db: Database, name: string, init: () => Promise<void>) {
  const instance = await db.getInstance() as object
  if (initialized.get(instance)?.has(name)) return
  await init()
  const names = initialized.get(instance) ?? new Set<string>()
  names.add(name)
  initialized.set(instance, names)
}
