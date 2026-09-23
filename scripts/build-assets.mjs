import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const publicDir = path.join(rootDir, "public")

async function buildAssets() {
  console.log("🚀 Starting NewsHub asset build...")

  const iconSvgPath = path.join(publicDir, "icon.svg")
  const faviconSvgPath = path.join(publicDir, "favicon.svg")
  const svgContent = fs.readFileSync(iconSvgPath, "utf8")

  // 1. Ensure favicon.svg is in sync with icon.svg
  fs.writeFileSync(faviconSvgPath, svgContent, "utf8")
  console.log("✅ Synced public/favicon.svg from public/icon.svg")

  // 2. Launch browser to render icons and OG image
  const browser = await chromium.launch({
    executablePath:
      fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined,
    headless: true,
  })

  const page = await browser.newPage()

  // Set icon page content
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 100%; height: 100%; overflow: hidden; background: transparent; }
          svg { width: 100%; height: 100%; display: block; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `)

  // Render required icon dimensions
  const iconTargets = [
    { file: "apple-touch-icon.png", size: 180 },
    { file: "icon-192x192.png", size: 192 },
    { file: "icon-192.png", size: 192 },
    { file: "pwa-192x192.png", size: 192 },
    { file: "icon-512x512.png", size: 512 },
    { file: "icon-512.png", size: 512 },
    { file: "pwa-512x512.png", size: 512 },
    { file: "temp-16.png", size: 16 },
    { file: "temp-32.png", size: 32 },
    { file: "temp-48.png", size: 48 },
  ]

  for (const target of iconTargets) {
    await page.setViewportSize({ width: target.size, height: target.size })
    const buf = await page.screenshot({ omitBackground: true, type: "png" })
    fs.writeFileSync(path.join(publicDir, target.file), buf)
    console.log(`✅ Generated ${target.file} (${target.size}x${target.size})`)
  }

  // 3. Assemble multi-size favicon.ico (16, 32, 48) using Python PIL
  const temp16 = path.join(publicDir, "temp-16.png")
  const temp32 = path.join(publicDir, "temp-32.png")
  const temp48 = path.join(publicDir, "temp-48.png")
  const faviconIco = path.join(publicDir, "favicon.ico")

  execSync(`python3 -c "
from PIL import Image
im16 = Image.open('${temp16}')
im32 = Image.open('${temp32}')
im48 = Image.open('${temp48}')
im48.save('${faviconIco}', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[im16, im32])
"`)
  fs.unlinkSync(temp16)
  fs.unlinkSync(temp32)
  fs.unlinkSync(temp48)
  console.log("✅ Generated multi-size public/favicon.ico (16x16, 32x32, 48x48)")

  // 4. Generate high-quality 1200x630 OG Image
  const ogPage = await browser.newPage()
  await ogPage.setViewportSize({ width: 1200, height: 630 })

  const ogHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background-color: #08090C;
      font-family: 'Plus Jakarta Sans', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #FFFFFF;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    /* Ambient Glow Backgrounds */
    .glow-red {
      position: absolute;
      top: 15%;
      left: 50%;
      transform: translate(-50%, -20%);
      width: 650px;
      height: 450px;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.16) 0%, rgba(220, 38, 38, 0.05) 50%, transparent 75%);
      filter: blur(50px);
      pointer-events: none;
    }

    .glow-blue {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.07) 0%, transparent 70%);
      filter: blur(60px);
      pointer-events: none;
    }

    /* Tech Grid */
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(circle at 50% 50%, black 50%, transparent 95%);
      -webkit-mask-image: radial-gradient(circle at 50% 50%, black 50%, transparent 95%);
      pointer-events: none;
    }

    /* Radar Concentric Rings */
    .radar-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      pointer-events: none;
    }
    .ring-1 {
      width: 520px;
      height: 520px;
      border: 1px solid rgba(255, 59, 48, 0.08);
    }
    .ring-2 {
      width: 780px;
      height: 780px;
      border: 1px dashed rgba(255, 255, 255, 0.04);
    }
    .ring-3 {
      width: 1040px;
      height: 1040px;
      border: 1px solid rgba(255, 255, 255, 0.02);
    }

    /* Outer Frame Border */
    .frame-border {
      position: absolute;
      inset: 20px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      pointer-events: none;
    }

    /* Central Container within Safe Area (1000 x 530) */
    .safe-container {
      width: 1040px;
      height: 510px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 10;
      padding: 10px 0;
    }

    /* Top Bar */
    .top-badge-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 18px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #FF5A52;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #FF3B30;
      box-shadow: 0 0 10px #FF3B30;
    }

    .meta-domain {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 0.08em;
      font-family: monospace;
    }

    /* Hero Center: Logo + Title */
    .hero-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 20px;
    }

    .logo-title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 28px;
    }

    .logo-wrapper {
      position: relative;
      width: 116px;
      height: 116px;
      border-radius: 26px;
      box-shadow: 0 12px 36px -4px rgba(239, 68, 68, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-wrapper svg {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 26px;
    }

    .brand-title {
      font-size: 82px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.03em;
      display: flex;
      align-items: baseline;
    }

    .brand-title .news {
      color: #FFFFFF;
      text-shadow: 0 4px 24px rgba(255, 255, 255, 0.2);
    }

    .brand-title .hub-h {
      color: #FF3B30;
      text-shadow: 0 4px 24px rgba(255, 59, 48, 0.5);
    }

    .brand-title .hub-ub {
      color: #FFFFFF;
      text-shadow: 0 4px 24px rgba(255, 255, 255, 0.2);
    }

    /* Slogan */
    .slogan-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .slogan-en {
      font-size: 26px;
      font-weight: 600;
      color: #E2E8F0;
      letter-spacing: -0.01em;
    }

    .slogan-cn {
      font-size: 17px;
      font-weight: 500;
      color: #94A3B8;
      letter-spacing: 0.02em;
    }

    /* Source Badges Row */
    .sources-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: nowrap;
      margin-top: 10px;
    }

    .source-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      font-size: 15px;
      font-weight: 600;
      color: #F1F5F9;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .source-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    /* Bottom Info */
    .bottom-bar {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      padding-top: 14px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.45);
      font-weight: 500;
    }

    .bottom-features {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .feature-check {
      color: #FF3B30;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <!-- Ambient & Radars -->
  <div class="glow-red"></div>
  <div class="glow-blue"></div>
  <div class="grid-bg"></div>
  <div class="radar-ring ring-1"></div>
  <div class="radar-ring ring-2"></div>
  <div class="radar-ring ring-3"></div>
  <div class="frame-border"></div>

  <!-- Safe Container (1040 x 510) -->
  <div class="safe-container">
    <!-- Top Bar -->
    <div class="top-badge-bar">
      <div class="badge-pill">
        <div class="badge-dot"></div>
        <span>LIVE RADAR STREAMING</span>
      </div>
      <div class="meta-domain">205077.XYZ</div>
    </div>

    <!-- Center Hero -->
    <div class="hero-center">
      <div class="logo-title-row">
        <div class="logo-wrapper">
          ${svgContent}
        </div>
        <div class="brand-title">
          <span class="news">News</span><span class="hub-h">H</span><span class="hub-ub">ub</span>
        </div>
      </div>

      <div class="slogan-box">
        <div class="slogan-en">Real-time Tech, Science & Developer News Aggregator</div>
        <div class="slogan-cn">即時科技 · 科學探索 · 開發者情報聚合</div>
      </div>

      <!-- Source Badges / Pills -->
      <div class="sources-row">
        <div class="source-pill">
          <span class="source-indicator" style="background: #FFFFFF; box-shadow: 0 0 6px rgba(255,255,255,0.8);"></span>
          <span>Dev.to</span>
        </div>
        <div class="source-pill">
          <span class="source-indicator" style="background: #E11D48; box-shadow: 0 0 6px #E11D48;"></span>
          <span>Nature</span>
        </div>
        <div class="source-pill">
          <span class="source-indicator" style="background: #FF6600; box-shadow: 0 0 6px #FF6600;"></span>
          <span>Hacker News</span>
        </div>
        <div class="source-pill">
          <span class="source-indicator" style="background: #DA552F; box-shadow: 0 0 6px #DA552F;"></span>
          <span>Product Hunt</span>
        </div>
        <div class="source-pill">
          <span class="source-indicator" style="background: #0284C7; box-shadow: 0 0 6px #0284C7;"></span>
          <span>Phys.org</span>
        </div>
        <div class="source-pill">
          <span class="source-indicator" style="background: #0084FF; box-shadow: 0 0 6px #0084FF;"></span>
          <span>知乎</span>
        </div>
        <div class="source-pill">
          <span class="source-indicator" style="background: #E6162D; box-shadow: 0 0 6px #E6162D;"></span>
          <span>微博</span>
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="bottom-bar">
      <div>postsoma-2050 · NewsHub Architecture</div>
      <div class="bottom-features">
        <div class="feature-item"><span class="feature-check">✓</span> 零延遲流式更新</div>
        <div class="feature-item"><span class="feature-check">✓</span> 多平臺情報聚合</div>
        <div class="feature-item"><span class="feature-check">✓</span> AI / GEO 檢索優化</div>
      </div>
    </div>
  </div>
</body>
</html>
`

  await ogPage.setContent(ogHtml, { waitUntil: "networkidle" })
  const ogBuf = await ogPage.screenshot({ type: "png" })
  fs.writeFileSync(path.join(publicDir, "og-image.png"), ogBuf)
  console.log("✅ Generated public/og-image.png (1200x630, 16:9)")

  await browser.close()
  console.log("🎉 All NewsHub icons & OG Image built successfully!")
}

buildAssets().catch((err) => {
  console.error("❌ Error building assets:", err)
  process.exit(1)
})
