const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {}

export const GA_ROLLUP_ID =
  env.VITE_GA_ROLLUP_ID || "G-NZ2V582QTN"

export const GA_PROJECT_ID =
  env.VITE_GA_PROJECT_ID || env.VITE_GA_ID || "G-RL5TXGWY67"

export const GA_PROJECT_NAME =
  env.VITE_GA_PROJECT_NAME || "news_hub"

export const GA_COGNITIVE_LAYER =
  env.VITE_GA_COGNITIVE_LAYER || "Signal"

export const UMAMI_WEBSITE_ID =
  env.VITE_UMAMI_WEBSITE_ID || "9f4196e1-ed4d-473a-9a2f-51f0b80024c5"

export const UMAMI_SCRIPT_URL =
  env.VITE_UMAMI_SCRIPT_URL || "https://pulse.postsoma-2050.website/pulse.js"

export const CROSS_DOMAIN_LIST = [
  "news.postsoma-2050.com",
  "postsoma-2050.website",
  "postsoma-2050.com",
  "www.postsoma-2050.com",
  "www.205011.xyz",
  "205011.xyz",
  "www.205022.xyz",
  "205022.xyz",
  "www.205033.xyz",
  "205033.xyz",
  "www.205044.xyz",
  "205044.xyz",
  "www.205055.xyz",
  "205055.xyz",
  "www.205077.xyz",
  "205077.xyz",
  "quantbrews.win",
  "recipelab.cc",
  "www.readselah.org",
  "readselah.org",
  "prayselah.org",
  "postsomabooks.qzz.io",
]

export function isLocalHostname(hostname: string): boolean {
  const normalized = (hostname || "").trim().toLowerCase()
  return (
    normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "0.0.0.0"
    || normalized.endsWith(".local")
  )
}

export function isValidGaId(id?: string): id is string {
  const normalized = (id || "").trim().toUpperCase()
  return (
    normalized !== "PENDING"
    && !normalized.startsWith("G-XXXXXXXX")
    && /^G-[A-Z0-9]+$/.test(normalized)
  )
}
