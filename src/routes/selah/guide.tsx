import { createFileRoute, Link } from "@tanstack/react-router"
import { SELAH_CWS_URLS } from "../../utils/selah-cws"

export const Route = createFileRoute("/selah/guide")({
  component: SelahGuidePage,
})

const CONTEXT_SCENARIOS = [
  {
    id: "reader",
    problem: "页面广告、侧栏或弹窗过多，无法集中注意力阅读",
    toolName: "Selah Reader",
    toolType: "Chrome Extension",
    icon: "i-ph:book-open-duotone",
    cwsUrl: SELAH_CWS_URLS.reader,
    steps: [
      "在 Chrome 中打开任意格式混乱或广告较多的网页。",
      "点击浏览器右上角 Selah Reader 图标（或快捷键）。",
      "自动进入提取后的纯净文本视图，支持调节字体与暗色背景。",
    ],
    note: "Just-in-time 消除干扰，保留原始 URL 引用。",
  },
  {
    id: "translate",
    problem: "遇到外语文章、生词或领域专业术语，频繁打断阅读",
    toolName: "Selah Translate",
    toolType: "Chrome Extension",
    icon: "i-ph:translate-duotone",
    cwsUrl: SELAH_CWS_URLS.translate,
    steps: [
      "在阅读英文或外语网页时，选中任意词汇或段落。",
      "行间将自然出现实时翻译浮层或对照译文。",
      "无缝查阅术语解析，无需打开独立的翻译软件或新标签页。",
    ],
    note: "行间对照呈现，保留原文语境。",
  },
  {
    id: "pace",
    problem: "面对数千字长文章容易走神，或陷入无止境划屏",
    toolName: "Selah Pace",
    toolType: "Chrome Extension",
    icon: "i-ph:timer-duotone",
    cwsUrl: SELAH_CWS_URLS.pace,
    steps: [
      "打开需要深度阅读的长文页面。",
      "启动 Selah Pace，设置一个温和的阅读专注时段（如 15 分钟）。",
      "在专注窗口内静心读完，系统将在本地记录本次阅读会话。",
    ],
    note: "温和无压力的时间辅助，无排行榜与打卡焦虑。",
  },
  {
    id: "hold",
    problem: "发现有价值的文章或资料，读到一半或暂时没时间深度阅读",
    toolName: "Selah Hold",
    toolType: "Chrome Extension",
    icon: "i-ph:push-pin-duotone",
    cwsUrl: SELAH_CWS_URLS.hold,
    steps: [
      "在任意网页点击 Selah Hold 图标，将该网页一键加入暂存队列。",
      "系统将基于网页信息提示建议分类，或由你决定预计回访时间。",
      "空闲时集中打开暂存队列进行二次深度阅读、研究或归档。",
    ],
    note: "本地优先的短期回访队列，非永久书签栏或收藏夹。",
  },
  {
    id: "listen",
    problem: "阅读时遇到重点段落或句子，希望直接用语音听读发音",
    toolName: "Selah Listen",
    toolType: "Chrome Extension",
    icon: "i-ph:headphones-duotone",
    cwsUrl: SELAH_CWS_URLS.listen,
    steps: [
      "在网页中用鼠标选中想要听读的任意文本或段落。",
      "点击浮出的 Selah Listen 按钮或使用快捷键启动发音。",
      "根据习惯微调朗读语速（1.0x - 2.0x）或切换发音引擎。",
    ],
    note: "支持浏览器本地 TTS 发音与可选 AI 接口接入；仅针对选中文本发音（不支持全篇朗读与熄屏播放）。",
  },
  {
    id: "newshub",
    problem: "不知道在线世界现在发生了什么，缺乏优质内容源头",
    toolName: "NewsHub",
    toolType: "Web Application",
    icon: "i-ph:newspaper-duotone",
    isInternal: true,
    internalUrl: "/",
    steps: [
      "访问 NewsHub 首页，按“新闻”、“热榜”、“实时”分类浏览。",
      "通过高密度终端式视图快速扫视全球科技与资讯动态。",
      "点击感兴趣的高质量文章标题，直接跳转至原始出处进行深度阅读。",
    ],
    note: "无广告、无排序干扰的高密度信息聚合终端。",
  },
]

function SelahGuidePage() {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  })
  const [showChecklist, setShowChecklist] = useState(true)

  const toggleChecklistStep = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const completedCount = Object.values(checklist).filter(Boolean).length

  return (
    <div className="space-y-10 py-2">
      {/* Page Title Header */}
      <section className="space-y-3 border-b border-white/10 pb-8">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
            Just-in-Time Reading Guide
          </span>
          <span className="text-xs text-neutral-400 font-mono">情境化指南</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold font-brand tracking-tight text-white">
          按当下阅读遇到的问题查找建议
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          你不需要预先学习四个扩展的功能差异。认清你现在遇到的阅读阻碍，随取随用最合适的辅助工具。
        </p>
      </section>

      {/* First-time Lightweight Experience Checklist */}
      {showChecklist && (
        <section className="p-6 rounded-xl bg-gradient-to-r from-red-500/10 via-white/[0.03] to-transparent border border-red-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="i-ph:flag-banner-duotone text-red-400 text-lg" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                首次体验示范流程 ({completedCount} / 4)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowChecklist(false)}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              隐藏检查清单
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: "step1", text: "1. 打开一篇文章", sub: "在 NewsHub 或任意网页" },
              { id: "step2", text: "2. 尝试启动 Reader", sub: "一键清理干扰浮窗" },
              { id: "step3", text: "3. 选中任意一句文本", sub: "触发选词辅助交互" },
              { id: "step4", text: "4. 试用 Translate/Listen", sub: "体验翻译或听读" },
            ].map((st) => {
              const checked = checklist[st.id]
              return (
                <div
                  key={st.id}
                  onClick={() => toggleChecklistStep(st.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleChecklistStep(st.id)
                    }
                  }}
                  className={$(
                    "p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between min-h-[72px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
                    checked
                      ? "bg-white/10 border-red-500/40 text-white"
                      : "bg-white/[0.02] border-white/10 text-neutral-300 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold">{st.text}</span>
                    <span
                      className={$(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                        checked ? "bg-red-500 text-white" : "border border-white/20"
                      )}
                    >
                      {checked && "✓"}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1">{st.sub}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Contextual Scenarios List */}
      <section className="space-y-6">
        {CONTEXT_SCENARIOS.map((sc) => (
          <div
            key={sc.id}
            id={sc.id}
            className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-4 scroll-mt-24"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">
                  <span className={`${sc.icon} text-xl`} />
                </div>
                <div>
                  <div className="text-xs text-red-400/90 font-mono">情境问题 · Scenario</div>
                  <h3 className="text-base md:text-lg font-bold text-white tracking-tight mt-0.5">
                    “{sc.problem}”
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                <span className="text-xs font-mono text-neutral-400 bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.08]">
                  {sc.toolName}
                </span>

                {sc.isInternal ? (
                  <Link
                    to={sc.internalUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <span>Open NewsHub</span>
                    <span className="i-ph:arrow-right-bold text-[10px]" />
                  </Link>
                ) : (
                  <a
                    href={sc.cwsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <span>获取扩展</span>
                    <span className="i-ph:arrow-square-out-duotone text-xs" />
                  </a>
                )}
              </div>
            </div>

            {/* Action Steps */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-mono text-neutral-400">建议可操作步骤：</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {sc.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-black/30 border border-white/[0.04] space-y-1"
                  >
                    <div className="text-[11px] font-mono text-red-400">Step 0{idx + 1}</div>
                    <p className="text-xs text-neutral-300 leading-relaxed">{st}</p>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-neutral-400 italic pt-1">
                💡 提示：{sc.note}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Footer Navigation CTA */}
      <section className="p-6 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h3 className="text-base font-semibold text-white">找到适合你当前阅读情境的工具了吗？</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            可随时前往扩展清单查看完整分工说明与对应 Chrome Web Store 安装入口。
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            to={"/selah/extensions" as any}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
          >
            <span>浏览扩展清单</span>
            <span className="i-ph:arrow-right-bold text-[10px]" />
          </Link>
        </div>
      </section>
    </div>
  )
}
