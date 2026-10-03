import { afterEach, expect, it, vi } from "vitest"
import { safeStorage } from "@shared/storage"
afterEach(() => vi.unstubAllGlobals())
it("keeps reading and writing when browser storage is denied", () => {
  vi.stubGlobal("localStorage", { getItem() { throw new Error("denied") }, setItem() { throw new Error("full") }, removeItem() { throw new Error("denied") } })
  expect(() => safeStorage.setItem("test-storage", "value")).not.toThrow()
  expect(safeStorage.getItem("test-storage")).toBe("value")
  safeStorage.removeItem("test-storage")
  expect(safeStorage.getItem("test-storage")).toBeNull()
})
