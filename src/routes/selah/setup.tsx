import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/selah/setup")({
  component: SelahSetupWizard,
})

const ALL_TOOLS = [
  {
    id: "reader",
    name: "Selah Reader",
    actionTitle: "专注阅读 · 消除干扰",
    desc: "清理网页干扰与悬浮物，提取纯粹排版",
    cwsUrl: "https://chromewebstore.google.com/detail/nnpnfhchnogjjmpkglednkibohnahibe",
    icon: "i-ph:book-open-duotone",
  },
  {
    id: "translate",
    name: "Selah Translate",
    actionTitle: "自然翻译 · 消除外语屏障",
    desc: "双语行间对照与划词释义，保持沉浸阅读",
    cwsUrl: "https://chromewebstore.google.com/detail/knkabdofpjnhgeoohhkfdkgmnjlhbheb",
    icon: "i-ph:translate-duotone",
  },
  {
    id: "pace",
    name: "Selah Pace",
    actionTitle: "阅读节奏 · 温和时间辅助",
    desc: "长文章专注倒计时与本地会话管理",
    cwsUrl: "https://chromewebstore.google.com/detail/fmjcgbifpjhcefmmejbanbakanckdmbo",
    icon: "i-ph:timer-duotone",
  },
  {
    id: "listen",
    name: "Selah Listen",
    actionTitle: "划词听读 · 选中文本发音",
    desc: "选中文字即时转化为语音，支持本地 TTS 与可选 AI 接口",
    cwsUrl: "https://chromewebstore.google.com/detail/lblcfjimgkpmfpfjlekgfdmplcicnfal",
    icon: "i-ph:headphones-duotone",
  },
]

function SelahSetupWizard() {
  const [selectedIds, setSelectedIds] = useState<string[]>(["reader", "translate", "pace", "listen"])
  const [currentStep, setCurrentStep] = useState<"select" | "install" | "done">("select")
  const [activeInstallIndex, setActiveInstallIndex] = useState(0)
  const [confirmedStatus, setConfirmedStatus] = useState<Record<string, "installed" | "skipped">>({})

  const selectedTools = useMemo(() => {
    return ALL_TOOLS.filter((t) => selectedIds.includes(t.id))
  }, [selectedIds])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedIds(ALL_TOOLS.map((t) => t.id))
  }

  const startInstallSequence = () => {
    if (selectedTools.length === 0) {
      setCurrentStep("done")
      return
    }
    setActiveInstallIndex(0)
    setCurrentStep("install")
  }

  const handleOpenStoreAndNext = (tool: typeof ALL_TOOLS[number]) => {
    window.open(tool.cwsUrl, "_blank", "noopener,noreferrer")
    setConfirmedStatus((prev) => ({ ...prev, [tool.id]: "installed" }))
    if (activeInstallIndex < selectedTools.length - 1) {
      setActiveInstallIndex((prev) => prev + 1)
    } else {
      setCurrentStep("done")
    }
  }

  const handleSkipCurrent = (tool: typeof ALL_TOOLS[number]) => {
    setConfirmedStatus((prev) => ({ ...prev, [tool.id]: "skipped" }))
    if (activeInstallIndex < selectedTools.length - 1) {
      setActiveInstallIndex((prev) => prev + 1)
    } else {
      setCurrentStep("done")
    }
  }

  const currentTool = selectedTools[activeInstallIndex]

  return (
    <div className="space-y-8 py-2 max-w-2xl mx-auto">
      {/* Wizard Step Progress Header */}
      <div className="space-y-3 text-center sm:text-left border-b border-white/10 pb-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">
            Installation Wizard
          </span>
          <span className="text-xs text-neutral-400 font-mono">
            Step {currentStep === "select" ? "1 / 3" : currentStep === "install" ? "2 / 3" : "3 / 3"}
          </span>
        </div>
        <h1 className="text-2xl font-bold font-brand tracking-tight text-white">
          {currentStep === "select" && "选择你想配置的 Selah 阅读扩展"}
          {currentStep === "install" && "按需前往 Chrome Web Store 确认安装"}
          {currentStep === "done" && "配置向导已完成"}
        </h1>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {currentStep === "select" && "受 Chrome 浏览器机制约束，扩展需由你在 Web Store 中手动点击添加。请选择你需要的工具。"}
          {currentStep === "install" && "点击“打开 Web Store 安装”，完成添加后点击“确认继续”进入下一项。也可随时跳过。"}
          {currentStep === "done" && "已完成选择与确认流程。你现在可以在任意网页上使用已安装的插件。"}
        </p>
      </div>

      {/* Step 1: Selection View */}
      {currentStep === "select" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              已选择 {selectedIds.length} / {ALL_TOOLS.length} 个扩展
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              全选全部扩展
            </button>
          </div>

          <div className="space-y-3">
            {ALL_TOOLS.map((tool) => {
              const isChecked = selectedIds.includes(tool.id)
              return (
                <div
                  key={tool.id}
                  onClick={() => toggleSelect(tool.id)}
                  className={$(
                    "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                    isChecked
                      ? "bg-white/[0.04] border-red-500/30 text-white"
                      : "bg-white/[0.01] border-white/10 text-neutral-400 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={`${tool.icon} text-xl text-red-400 flex-shrink-0`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{tool.actionTitle}</span>
                        <span className="text-xs text-neutral-400 font-mono">({tool.name})</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{tool.desc}</p>
                    </div>
                  </div>

                  <div
                    className={$(
                      "w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0",
                      isChecked ? "bg-red-500 border-red-400 text-white" : "border-white/20"
                    )}
                  >
                    {isChecked && <span className="i-ph:check-bold text-xs" />}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <Link
              to={"/selah/extensions" as any}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              返回扩展列表
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to={"/selah" as any}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Skip for now
              </Link>
              <button
                type="button"
                onClick={startInstallSequence}
                disabled={selectedIds.length === 0}
                className="px-5 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                开始引导流程 ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Install Guide Sequence */}
      {currentStep === "install" && currentTool && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-6">
            <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-white/[0.06] pb-3">
              <span>
                正在处理：第 {activeInstallIndex + 1} / {selectedTools.length} 项
              </span>
              <span className="font-mono">{currentTool.name}</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                <span className={`${currentTool.icon} text-2xl`} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">{currentTool.actionTitle}</h3>
                <p className="text-xs text-neutral-300">{currentTool.desc}</p>
                <div className="pt-2 text-[11px] text-neutral-400 font-mono">
                  Official URL: {currentTool.cwsUrl}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-300 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-semibold">
                <span className="i-ph:info-duotone text-base" />
                安装步骤提示
              </div>
              <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
                <li>点击下方“前往 Store 安装此扩展”在新标签页中打开官方商店。</li>
                <li>在 Chrome Web Store 中点击“Add to Chrome / 添加至 Chrome”。</li>
                <li>返回本页面，点击“确认已安装，继续下一个”进入下一项。</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSkipCurrent(currentTool)}
                className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
              >
                跳过此工具
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenStoreAndNext(currentTool)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-all cursor-pointer shadow-sm"
                >
                  <span>前往 Store 安装并下一步</span>
                  <span className="i-ph:arrow-square-out-duotone text-sm" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setCurrentStep("select")}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              ← 重新选择扩展
            </button>

            <Link
              to={"/selah" as any}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              退出引导向导 (Skip remaining)
            </Link>
          </div>
        </div>
      )}

      {/* Step 3: Completion View */}
      {currentStep === "done" && (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center text-2xl">
            <span className="i-ph:check-circle-duotone" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">配置流程已完成</h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              感谢使用 Selah Hub 配置向导。你可以随时在任意开放网页中触发已添加的插件。
            </p>
          </div>

          {Object.keys(confirmedStatus).length > 0 && (
            <div className="max-w-md mx-auto p-4 rounded-lg bg-black/30 border border-white/5 text-left text-xs space-y-2">
              <div className="text-neutral-400 font-mono text-[11px]">手动确认记录汇总：</div>
              {Object.entries(confirmedStatus).map(([id, st]) => {
                const tool = ALL_TOOLS.find((t) => t.id === id)
                return (
                  <div key={id} className="flex items-center justify-between text-neutral-300">
                    <span>{tool?.name}</span>
                    <span
                      className={$(
                        "text-[11px] font-mono px-2 py-0.5 rounded",
                        st === "installed" ? "bg-red-500/10 text-red-300 border border-red-500/20" : "text-neutral-500"
                      )}
                    >
                      {st === "installed" ? "用户已确认跳转安装" : "已跳过"}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to={"/selah/guide" as any}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              <span className="i-ph:book-open-duotone text-sm" />
              查看场景使用指南
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="i-ph:compass-duotone text-sm" />
              返回 NewsHub 首页
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
