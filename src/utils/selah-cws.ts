/**
 * Centralized, authoritative Chrome Web Store URLs for Selah System Extensions.
 * All pages, setup wizards, and guides MUST exclusively reference these exact share URLs.
 */
export const SELAH_CWS_URLS = {
  hold: "https://chromewebstore.google.com/detail/selah-hold/ijbkhcjajhlpejlaigcagplakodgkhjp?authuser=0&hl=en",
  pace: "https://chromewebstore.google.com/detail/fmjcgbifpjhcefmmejbanbakanckdmbo?utm_source=item-share-cb",
  translate: "https://chromewebstore.google.com/detail/knkabdofpjnhgeoohhkfdkgmnjlhbheb?utm_source=item-share-cb",
  reader: "https://chromewebstore.google.com/detail/nnpnfhchnogjjmpkglednkibohnahibe?utm_source=item-share-cb",
  listen: "https://chromewebstore.google.com/detail/lblcfjimgkpmfpfjlekgfdmplcicnfal?utm_source=item-share-cb",
} as const

export type SelahExtensionId = keyof typeof SELAH_CWS_URLS
