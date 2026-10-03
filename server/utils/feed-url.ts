export function validateFeedURL(input: string) {
  const url = new URL(input)
  const host = url.hostname.toLowerCase()
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
    || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")
    || /^(?:127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)
    || host.startsWith("[")) {
    throw new Error("Use a public HTTP(S) feed URL without credentials")
  }
  return url.href
}
