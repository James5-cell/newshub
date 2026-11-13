import { describe, expect, it } from "vitest"
import {
  CROSS_DOMAIN_LIST,
  GA_COGNITIVE_LAYER,
  GA_PROJECT_ID,
  GA_PROJECT_NAME,
  GA_ROLLUP_ID,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
  isLocalHostname,
  isValidGaId,
} from "../src/config/analytics"

describe("news_hub dual-engine analytics config", () => {
  it("uses Signal layer and news_hub identifiers", () => {
    expect(GA_ROLLUP_ID).toBe("G-NZ2V582QTN")
    expect(GA_PROJECT_ID).toBe("G-RL5TXGWY67")
    expect(GA_PROJECT_NAME).toBe("news_hub")
    expect(GA_COGNITIVE_LAYER).toBe("Signal")
    expect(UMAMI_WEBSITE_ID).toBe("9f4196e1-ed4d-473a-9a2f-51f0b80024c5")
    expect(UMAMI_SCRIPT_URL).toBe("https://pulse.postsoma-2050.website/pulse.js")
    expect(CROSS_DOMAIN_LIST).toContain("news.postsoma-2050.com")
  })

  it("validates GA4 IDs and local hostnames", () => {
    expect(isValidGaId("G-NZ2V582QTN")).toBe(true)
    expect(isValidGaId("PENDING")).toBe(false)
    expect(isValidGaId("G-XXXXXXXX")).toBe(false)
    expect(isLocalHostname("localhost")).toBe(true)
    expect(isLocalHostname("127.0.0.1")).toBe(true)
    expect(isLocalHostname("news.postsoma-2050.com")).toBe(false)
  })
})
