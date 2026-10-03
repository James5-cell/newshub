interface StringStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const memory = new Map<string, string>()
const pending = new Set<string>()
function persistent(): StringStorage | undefined {
  try {
    return (globalThis as { localStorage?: StringStorage }).localStorage
  } catch {
    return undefined
  }
}

// Storage may be denied or full. Keep the current tab usable in memory.
export const safeStorage: StringStorage = {
  getItem(key) {
    if (pending.has(key)) return memory.get(key) ?? null
    try {
      const storage = persistent()
      if (storage) return storage.getItem(key)
    } catch {}
    return memory.get(key) ?? null
  },
  setItem(key, value) {
    memory.set(key, value)
    pending.add(key)
    try {
      const storage = persistent()
      if (storage) {
        storage.setItem(key, value)
        pending.delete(key)
      }
    } catch {}
  },
  removeItem(key) {
    memory.delete(key)
    pending.add(key)
    try {
      const storage = persistent()
      if (storage) {
        storage.removeItem(key)
        pending.delete(key)
      }
    } catch {}
  },
}
