import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/selah/extensions")({
  component: SelahExtensionsPage,
})

export const SELAH_EXTENSIONS = [
  {
    id: "reader",
    number: "01",
    name: "Selah Reader",
    actionTitle: "专注阅读 · 消除干扰",
    tagline: "清理网页侧栏、弹窗与视觉悬浮物，一键进入沉浸阅读状态",
    description: "专为长文与新闻设计的纯净视图助手。保留正文、标题与必需图片，自动应用更舒缓的字号、行距与主题配色，让你的眼睛专注于文字本身。",
    cwsUrl: "https://chromewebstore.google.com/detail/nnpnfhchnogjjmpkglednkibohnahibe",
    icon: "i-ph:book-open-duotone",
    guideAnchor: "/selah/guide#reader" as any,
    highlights: ["一键提取正文", "自定义字号与行宽", "无缝适配深浅色"],
  },
  {
    id: "translate",
    number: "02",
    name: "Selah Translate",
    actionTitle: "自然翻译 · 消除外语屏障",
    tagline: "双语行间对照与划词即译，保持原生浏览节奏无中断",
    description: "无感融入网页的轻量翻译扩展。支持网页全篇行间双语对照、选定段落翻译与专业术语实时释义，无需频繁切换标签页或打开翻译软件。",
    cwsUrl: "https://chromewebstore.google.com/detail/knkabdofpjnhgeoohhkfdkgmnjlhbheb",
    icon: "i-ph:translate-duotone",
    guideAnchor: "/selah/guide#translate" as any,
    highlights: ["行间双语对照", "划词术语小卡片", "保持原生阅读节奏"],
  },
  {
    id: "pace",
    number: "03",
    name: "Selah Pace",
    actionTitle: "阅读节奏 · 温和时间辅助",
    tagline: "为深度阅读建立有限专注时段，记录本地阅读会话",
    description: "拒绝无止境无限划屏。Selah Pace 为长文章提供温和的阅读专注倒计时与本地会话跟踪，帮助你在开放网页中建立可控、有意识的深度阅读习惯。",
    cwsUrl: "https://chromewebstore.google.com/detail/fmjcgbifpjhcefmmejbanbakanckdmbo",
    icon: "i-ph:timer-duotone",
    guideAnchor: "/selah/guide#pace" as any,
    highlights: ["自定义阅读倒计时", "本地专注会话记录", "无压力温和提醒"],
  },
  {
    id: "listen",
    number: "04",
    name: "Selah Listen",
    actionTitle: "划词听读 · 选中文本发音",
    tagline: "选中文字即时转化为语音，支持本地 TTS 与可选 AI 接口",
    description: "专注选中文本的即时听读助手。选中任意段落或语句后一键朗读，支持语速调节、标准浏览器本地 TTS 发音以及可选 AI 模型接口接入（注：仅针对选中文本发音，不支持全篇朗读或熄屏后台播放）。",
    cwsUrl: "https://chromewebstore.google.com/detail/lblcfjimgkpmfpfjlekgfdmplcicnfal",
    icon: "i-ph:headphones-duotone",
    guideAnchor: "/selah/guide#listen" as any,
    highlights: ["划词选中文本即读", "本地 TTS / AI 接口", "语速微调控制"],
  },
]

function SelahExtensionsPage() {
  return (
    <div className="space-y-10 py-2">
      {/* Page Header */}
      <section className="space-y-3 border-b border-white/10 pb-8">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
            Official Chrome Extensions
          </span>
          <span className="text-xs text-neutral-400 font-mono">Manifest V3</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold font-brand tracking-tight text-white">
          Selah 阅读辅助扩展清单
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          四个轻量级独立扩展，各自解决阅读链路中的明确痛点。均已上架 Chrome Web Store，可根据个人习惯单独或组合安装。
        </p>
      </section>

      {/* Long Vertical List (纵向工具清单) */}
      <section className="space-y-6" aria-label="Selah 扩展工具纵向清单">
        {SELAH_EXTENSIONS.map((ext) => (
          <article
            key={ext.id}
            aria-labelledby={`ext-title-${ext.id}`}
            className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-start gap-4">
                <span className="text-xs font-mono text-red-400 bg-white/[0.04] px-2.5 py-1 rounded border border-white/10 flex-shrink-0 mt-0.5">
                  {ext.number}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`${ext.icon} text-xl text-red-400`} aria-hidden="true" />
                    <h2 id={`ext-title-${ext.id}`} className="text-lg font-bold text-white tracking-tight">
                      {ext.actionTitle}
                    </h2>
                    <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                      ({ext.name})
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-medium mt-1">
                    {ext.tagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <Link
                  to={ext.guideAnchor}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[38px] flex items-center"
                >
                  场景指南
                </Link>
                <a
                  href={ext.cwsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`前往 Chrome 商店安装 ${ext.name}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 hover:border-red-500/40 transition-colors cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[38px]"
                >
                  <span>前往 Chrome 商店安装</span>
                  <span className="i-ph:arrow-square-out-duotone text-sm" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="md:col-span-2 text-xs text-neutral-400 leading-relaxed">
                {ext.description}
              </div>
              <div className="flex flex-wrap md:flex-col gap-2 justify-start md:justify-center">
                {ext.highlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 text-[11px] text-neutral-300 bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.06]"
                  >
                    <span className="i-ph:check-bold text-red-400 text-[10px]" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Setup Wizard Banner */}
      <section className="p-6 rounded-xl bg-gradient-to-r from-red-500/10 via-white/[0.02] to-transparent border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-semibold text-white">需要一步步引导安装？</h3>
          <p className="text-xs text-neutral-400">
            打开安装向导，勾选你需要的工具，我们将引导你逐项在 Chrome Web Store 中完成确认。
          </p>
        </div>

        <Link
          to={"/selah/setup" as any}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors flex-shrink-0 cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[44px]"
        >
          <span className="i-ph:list-checks-duotone text-base" aria-hidden="true" />
          打开步进安装向导
        </Link>
      </section>
    </div>
  )
}
