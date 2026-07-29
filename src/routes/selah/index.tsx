import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/selah/")({
  component: SelahHubIndex,
})

function SelahHubIndex() {
  const workflowSteps = [
    {
      step: "01",
      tag: "Discover",
      title: "发现优质内容",
      icon: "i-ph:compass-duotone",
      description: "在 NewsHub 的高密度聚合终端中浏览科技与资讯热榜，或在开放网页的任何角落遇到值得深入阅读的文章。",
      toolName: "NewsHub / Open Web",
      ctaText: "Open NewsHub",
      ctaTo: "/" as any,
    },
    {
      step: "02",
      tag: "Read",
      title: "清爽进入阅读状态",
      icon: "i-ph:book-open-duotone",
      description: "使用 Selah Reader 一键消除网页侧栏、浮窗与视觉干扰，提取纯粹的排版与核心内容，回归文字本身。",
      toolName: "Selah Reader",
      ctaText: "Explore Reader",
      ctaTo: "/selah/extensions" as any,
    },
    {
      step: "03",
      tag: "Understand",
      title: "消除语言与术语障碍",
      icon: "i-ph:translate-duotone",
      description: "使用 Selah Translate 进行行间自然沉浸式翻译，或实时查阅专业术语解析，保持原有阅读节奏无缝继续。",
      toolName: "Selah Translate",
      ctaText: "Explore Translate",
      ctaTo: "/selah/extensions" as any,
    },
    {
      step: "04",
      tag: "Pace",
      title: "建立专注阅读时段",
      icon: "i-ph:timer-duotone",
      description: "使用 Selah Pace 为长文章设置温和的专注阅读倒计时与本地会话管理，减少无止境划屏与注意力损耗。",
      toolName: "Selah Pace",
      ctaText: "Explore Pace",
      ctaTo: "/selah/extensions" as any,
    },
    {
      step: "05",
      tag: "Listen",
      title: "选中文本即时语音朗读",
      icon: "i-ph:headphones-duotone",
      description: "使用 Selah Listen 对选中的重点段落或词句一键转化为语音朗读，支持浏览器本地 TTS 与可选 AI 接口接入。",
      toolName: "Selah Listen",
      ctaText: "Explore Listen",
      ctaTo: "/selah/extensions" as any,
    },
  ]

  const systemLayers = [
    {
      role: "内容发现 · Discovery",
      name: "NewsHub",
      type: "Web Application",
      desc: "高密度、零干扰、无广告的开放新闻与趋势聚合终端。为你筛选并呈现在线世界值得关注的优质源头。",
      link: "/" as any,
      linkText: "进入 NewsHub 发现内容",
      icon: "i-ph:newspaper-duotone",
    },
    {
      role: "阅读辅助 · Reading Suite",
      name: "Selah Extensions",
      type: "Chrome Extension (MV3)",
      desc: "包含 Reader、Translate、Pace、Listen 四个轻量级无感插件，随时在任意网页按需呼出，辅助完整阅读周期。",
      link: "/selah/extensions" as any,
      linkText: "查看四个 Chrome 插件",
      icon: "i-ph:browsers-duotone",
    },
  ]

  return (
    <div className="space-y-12 py-2">
      {/* Hero Section */}
      <section className="space-y-6 text-center md:text-left border-b border-white/10 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-neutral-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Selah System · Conscious Web Reading
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-bold font-brand tracking-tight text-white leading-tight">
            更安静、更有意识地
            <span className="block text-neutral-400 font-normal text-2xl md:text-4xl mt-1">
              使用开放网页的一套连续系统
            </span>
          </h1>
          <p className="text-sm md:text-base text-neutral-400 max-w-2xl leading-relaxed">
            NewsHub 负责在茫茫网络中为你发现优质内容；Selah 扩展套件（Reader, Translate, Pace, Listen）则在任意网页中按需为你提供干扰清理、行间翻译、专注节奏与语音朗读。
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 hover:border-red-500/40 transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[44px]"
          >
            <span className="i-ph:compass-duotone text-base" />
            打开 NewsHub 发现内容
          </Link>

          <Link
            to={"/selah/extensions" as any}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.05] border border-white/15 text-white text-sm font-medium hover:bg-white/10 hover:border-white/25 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[44px]"
          >
            <span className="i-ph:squares-four-duotone text-base" />
            浏览系统扩展清单
          </Link>
        </div>
      </section>

      {/* System Information Architecture */}
      <section className="space-y-6" aria-labelledby="heading-architecture">
        <div className="space-y-2">
          <h2 id="heading-architecture" className="text-xl font-bold text-white flex items-center gap-2">
            <span className="i-ph:tree-structure-duotone text-red-400 text-xl" />
            系统架构分工
          </h2>
          <p className="text-xs text-neutral-400">
            NewsHub 与 Selah 扩展分工明确、协同工作，不改变现有高密度新闻聚合体验。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {systemLayers.map((layer) => (
            <div
              key={layer.name}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <span className="text-xs font-mono text-red-400/90 bg-red-500/10 px-2.5 py-0.5 rounded-md border border-red-500/20 whitespace-nowrap">
                    {layer.role}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400 whitespace-nowrap">
                    {layer.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <span className={`${layer.icon} text-2xl text-white`} />
                  <h3 className="text-lg font-semibold text-white">{layer.name}</h3>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed min-h-[36px]">
                  {layer.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06]">
                <Link
                  to={layer.link}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 rounded px-1"
                >
                  <span>{layer.linkText}</span>
                  <span className="i-ph:arrow-right-bold text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Workflow Section */}
      <section className="space-y-6" aria-labelledby="heading-workflow">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 id="heading-workflow" className="text-xl font-bold text-white flex items-center gap-2">
              <span className="i-ph:arrows-merge-duotone text-red-400 text-xl" />
              连续阅读工作流
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-400">
              非强制示范路径
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            从发现到理解，再到专注与听读——工具在需要时随时出现，不强制使用顺序。
          </p>
        </div>

        <div className="space-y-4">
          {workflowSteps.map((ws) => (
            <div
              key={ws.step}
              className="p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <span className="text-xs font-mono text-neutral-400 bg-white/[0.04] px-2.5 py-1 rounded border border-white/10 flex-shrink-0 mt-0.5">
                  {ws.step}
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`${ws.icon} text-lg text-red-400`} />
                    <span className="text-xs font-mono text-red-300 uppercase tracking-wider">
                      {ws.tag}
                    </span>
                    <span className="text-neutral-600">•</span>
                    <h3 className="text-sm font-semibold text-white">{ws.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                    {ws.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
                <span className="text-[11px] font-mono text-neutral-400 hidden lg:inline">
                  {ws.toolName}
                </span>
                <Link
                  to={ws.ctaTo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-white/[0.05] border border-white/10 text-xs font-medium text-neutral-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[38px]"
                >
                  <span>{ws.ctaText}</span>
                  <span className="i-ph:arrow-right-bold text-[10px]" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Next Step / Navigation Hooks */}
      <section className="p-6 rounded-xl bg-gradient-to-r from-red-500/10 via-white/[0.02] to-transparent border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-semibold text-white">准备好配置 Selah 工作流了吗？</h3>
          <p className="text-xs text-neutral-400">
            可以浏览扩展清单、使用引导向导快速跳转 Chrome Web Store，或按常见场景查找工具。
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            to={"/selah/extensions" as any}
            className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[38px] flex items-center"
          >
            查看扩展清单
          </Link>
          <Link
            to={"/selah/guide" as any}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-neutral-300 text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 min-h-[38px] flex items-center"
          >
            场景指南
          </Link>
        </div>
      </section>
    </div>
  )
}
