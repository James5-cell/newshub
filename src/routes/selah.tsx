import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router"

export const Route = createFileRoute("/selah")({
  component: SelahLayout,
})

function SelahLayout() {
  const location = useLocation()
  const currentPath = location.pathname

  const navItems = [
    { label: "Overview", to: "/selah" as any, pathMatch: (p: string) => p === "/selah" || p === "/selah/" },
    { label: "Extensions", to: "/selah/extensions" as any, pathMatch: (p: string) => p.startsWith("/selah/extensions") },
    { label: "Use Cases", to: "/selah/guide" as any, pathMatch: (p: string) => p.startsWith("/selah/guide") },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 space-y-8">
      {/* Product Container Header in Page Body */}
      <section className="space-y-6 border-b border-white/10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          {/* Selah Product Brand Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
                Selah System
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Open Web Reading System
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-brand tracking-tight text-white flex items-center gap-3">
              <span className="i-ph:circles-three-plus-duotone text-red-400 text-3xl" />
              Selah Framework
            </h1>
          </div>
        </div>

        {/* Selah Internal Page Tab Navigation Bar */}
        <nav aria-label="Selah Hub 页内导航" className="flex items-center gap-2 border-b border-transparent overflow-x-auto">
          {navItems.map((item) => {
            const active = item.pathMatch(currentPath)
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={$(
                  "px-3.5 py-2 text-sm font-medium transition-all relative cursor-pointer flex-shrink-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 rounded",
                  active
                    ? "text-white font-semibold after:(content-[''] absolute bottom-[-1px] left-0 right-0 h-[2px] bg-red-500)"
                    : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </section>

      {/* Main Content Area */}
      <main id="selah-main-content">
        <Outlet />
      </main>
    </div>
  )
}
