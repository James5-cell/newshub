import { createFileRoute, Link } from "@tanstack/react-router"
import { SELAH_CWS_URLS } from "../../utils/selah-cws"

export const Route = createFileRoute("/selah/extensions")({
  component: SelahExtensionsPage,
})

export interface SelahExtensionItem {
  id: string
  number: string
  name: string
  actionTitle: string
  tagline: string
  description: string
  cwsUrl: string
  icon: string
  guideAnchor: any
  highlights: string[]
}

export interface SelahExtensionGroup {
  id: string
  groupCode: string
  title: string
  subtitle: string
  description: string
  items: SelahExtensionItem[]
}

export const EXTENSION_GROUPS: SelahExtensionGroup[] = [
  {
    id: "reading-utilities",
    groupCode: "READING UTILITIES",
    title: "内容与注意力管理",
    subtitle: "Manage Content & Attention",
    description: "管理值得回来处理的内容，以及愿意投入的阅读时间。在进入阅读或暂停阅读时使用。",
    items: [
      {
        id: "hold",
        number: "01",
        name: "Selah Hold",
        actionTitle: "网页暂存 · 本地回访队列",
        tagline: "暂存值得稍后回来的网页，分类、回访、归档",
        description: "本地优先的短期网页暂存与回访工具。在初步阅读后，将有研究价值或暂时没时间读完的网页放入临时队列，方便集中分类处理、再次阅读或归档（注：非永久书签管理器、文件夹系统或知识库）。",
        cwsUrl: SELAH_CWS_URLS.hold,
        icon: "i-ph:push-pin-duotone",
        guideAnchor: "/selah/guide#hold" as any,
        highlights: ["本地优先暂存", "短期回访队列", "非永久书签栏"],
      },
      {
        id: "pace",
        number: "02",
        name: "Selah Pace",
        actionTitle: "阅读节奏 · 温和时间辅助",
        tagline: "为深度阅读建立有限专注时段，记录本地阅读会话",
        description: "拒绝无止境无限划屏。Selah Pace 为长文章提供温和的阅读专注倒计时与本地会话跟踪，帮助你在开放网页中建立可控、有意识的深度阅读习惯（注：无排行榜、成就与打卡焦虑）。",
        cwsUrl: SELAH_CWS_URLS.pace,
        icon: "i-ph:timer-duotone",
        guideAnchor: "/selah/guide#pace" as any,
        highlights: ["自定义阅读倒计时", "本地专注会话记录", "无压力温和提醒"],
      },
      {
        id: "bridge",
        number: "03",
        name: "Selah Bridge",
        actionTitle: "视频跨语阅读 · 精准片段捕获",
        tagline: "实时双语字幕与时间戳转写，无干扰沉浸理解与分享 YouTube 视频",
        description: "专为视频学习与研究打造的无干扰跨语言阅读工具。实时生成毫秒级双语字幕，一键提取结构化时间戳转写供 AI（ChatGPT / Claude / Gemini）分析，并支持在播放中随手捕获高价值金句与定向跳转分享。所有偏好与笔记均基于本地存储，无追踪、无账号依赖。",
        cwsUrl: SELAH_CWS_URLS.bridge,
        icon: "i-ph:subtitles-duotone",
        guideAnchor: "/selah/guide#bridge" as any,
        highlights: ["实时双语字幕 (15 种语言)", "结构化 AI 转写与 Prompt 导出", "关键片段书签与深度链接分享"],
      },
    ],
  },
  {
    id: "in-reading-tools",
    groupCode: "IN-READING TOOLS",
    title: "页面与行间即时工具",
    subtitle: "On-Demand In-Reading Tools",
    description: "在真正阅读页面时，按需要帮助清理、理解与听读。在你正浏览网页时即时呼出。",
    items: [
      {
        id: "reader",
        number: "01",
        name: "Selah Reader",
        actionTitle: "专注阅读 · 消除干扰",
        tagline: "清理网页侧栏、弹窗与视觉悬浮物，一键进入沉浸阅读状态",
        description: "专为长文与新闻设计的纯净视图助手。一键消除侧栏、弹窗与干扰悬浮物，保留正文、标题与必需图片，让眼睛专注于文字本身。",
        cwsUrl: SELAH_CWS_URLS.reader,
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
        description: "无感融入网页的轻量翻译扩展。支持网页全篇行间双语对照、选定段落翻译与专业术语划词即译，保持原生浏览节奏无中断。",
        cwsUrl: SELAH_CWS_URLS.translate,
        icon: "i-ph:translate-duotone",
        guideAnchor: "/selah/guide#translate" as any,
        highlights: ["行间双语对照", "划词术语小卡片", "保持原生阅读节奏"],
      },
      {
        id: "listen",
        number: "03",
        name: "Selah Listen",
        actionTitle: "划词听读 · 选中文本发音",
        tagline: "选中文字即时转化为语音，支持本地 TTS 与可选 AI 接口",
        description: "专注选中文本的即时听读助手。选中任意段落或语句后一键朗读，支持语速调节、标准浏览器本地 TTS 发音与可选 AI 接口接入（注：仅针对选中文本发音，不支持全篇朗读或熄屏后台播放）。",
        cwsUrl: SELAH_CWS_URLS.listen,
        icon: "i-ph:headphones-duotone",
        guideAnchor: "/selah/guide#listen" as any,
        highlights: ["划词选中文本即读", "本地 TTS / AI 接口", "语速微调控制"],
      },
      {
        id: "pagefirst",
        number: "04",
        name: "Selah PageFirst",
        actionTitle: "AI 页面助手 · 智能问答与提炼",
        tagline: "基于当前页面上下文的智能对话与总结，快速提取核心信息",
        description: "专为当前页面设计的智能阅读 Copilot。无需离开页面，即可对长文进行即时提炼、关键点总结或深度追问，帮你快速掌握内容精髓。",
        cwsUrl: SELAH_CWS_URLS.pagefirst,
        icon: "i-ph:sparkles-duotone",
        guideAnchor: "/selah/guide#pagefirst" as any,
        highlights: ["页面上下文即时对话", "一键提炼核心要点", "无缝融入原生阅读"],
      },
    ],
  },
]

export const SELAH_EXTENSIONS = EXTENSION_GROUPS.flatMap((g) => g.items)

function SelahExtensionsPage() {
  return (
    <div className="space-y-12 py-2">
      {/* Page Header */}
      <section className="space-y-3 border-b border-white/10 pb-8">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
            Official Chrome Extensions Suite
          </span>
          <span className="text-xs text-neutral-400 font-mono">Manifest V3 · 7 Tools</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold font-brand tracking-tight text-white">
          Selah 阅读工具系统扩展清单
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          分为“内容与注意力管理”（Reading Utilities）与“页面与行间即时工具”（In-Reading Tools）两大组。各扩展均可独立使用或按需组合，不设强制线性流程。
        </p>
      </section>

      {/* Grouped Extensions List */}
      <div className="space-y-12">
        {EXTENSION_GROUPS.map((group) => {
          const anchorId = group.id === "reading-utilities" ? "utilities" : "in-reading"
          return (
            <section
              key={group.id}
              id={anchorId}
              className="space-y-6 scroll-mt-24"
              aria-labelledby={`group-title-${group.id}`}
            >
            {/* Group Header */}
            <div className="space-y-1.5 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-red-400/90 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  {group.groupCode}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  {group.subtitle}
                </span>
              </div>
              <h2 id={`group-title-${group.id}`} className="text-xl font-bold text-white tracking-tight">
                {group.title}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                {group.description}
              </p>
            </div>

            {/* Extension Cards in Group */}
            <div className="space-y-6">
              {group.items.map((ext) => (
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
                          <h3 id={`ext-title-${ext.id}`} className="text-lg font-bold text-white tracking-tight">
                            {ext.actionTitle}
                          </h3>
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
                        className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 rounded px-1 py-0.5"
                      >
                        场景指南
                      </Link>
                      <a
                        href={ext.cwsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`获取扩展 ${ext.name}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 hover:border-red-500/40 transition-colors cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[38px]"
                      >
                        <span>获取扩展</span>
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
            </div>
          </section>
        )})}
      </div>

    </div>
  )
}
