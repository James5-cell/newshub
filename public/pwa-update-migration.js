// The previous client can miss the update event. Reload its open pages once
// when this worker first replaces an existing registration.
const migrationCache = "newshub-pwa-update-migration-v1"
const migrationKey = new URL("__pwa_update_migration_v1__", self.registration.scope).href

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(migrationCache)
      if (!await cache.match(migrationKey)) {
        await cache.put(migrationKey, new Response(self.registration.active ? "upgrade" : "fresh"))
      }
    } catch (error) {
      console.error("Could not prepare the PWA update migration", error)
    }
  })())
})

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(migrationCache)
      const marker = await cache.match(migrationKey)
      if (!marker || await marker.text() !== "upgrade") return
      await cache.put(migrationKey, new Response("done"))
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clients) {
        // Do not wait for navigation while the worker is still activating.
        void client.navigate(client.url).catch(() => {})
      }
    } catch (error) {
      console.error("Could not reload an older PWA client", error)
    }
  })())
})
