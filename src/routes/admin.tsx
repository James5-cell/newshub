import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import type { CustomSourceInfo } from "~/hooks/useCustomSources"
import { safeParseString } from "~/utils"
import { sources } from "@shared/sources"
import { typeSafeObjectEntries } from "@shared/type.util"

export const Route = createFileRoute("/admin")({
  component: AdminPage,
})

interface AdminSource {
  id: string
  name: string
  subdomain: string
  type: string
  column_id: string
  color: string
  is_active: number
  interval_ms: number
  home_url: string
  created_at: number
  updated_at: number
  is_mainstream_media?: number
  priority_weight?: number
  tags?: string
  badge_label?: string
}

const STATIC_COLLAPSED_COUNT = 8
const PREVIEW_COLLAPSED_COUNT = 5

function getAuthHeaders() {
  const jwt = safeParseString(localStorage.getItem("jwt"))
  return jwt ? { Authorization: `Bearer ${jwt}` } : {}
}

function AdminPage() {
  const { loggedIn, enableLogin } = useLogin()
  const queryClient = useQueryClient()

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["admin-check"],
    queryFn: async () => {
      const res: { isAdmin: boolean } = await myFetch("/admin/check", {
        headers: getAuthHeaders(),
      })
      return res
    },
    enabled: loggedIn,
    retry: false,
  })

  const { data: allSources = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: async () => {
      const res: AdminSource[] = await myFetch("/admin/sources", {
        headers: getAuthHeaders(),
      })
      return res
    },
    enabled: !!adminCheck?.isAdmin,
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      return await myFetch("/admin/sources", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ["custom-sources"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
    },
  })

  const [updatingDynamicId, setUpdatingDynamicId] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      setUpdatingDynamicId(body.id)
      return await myFetch("/admin/sources", {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    },
    onSuccess: (_, variables) => {
      if (variables.is_active === 0) {
        queryClient.setQueryData(["custom-sources"], (old: CustomSourceInfo[] | undefined) => {
          if (!old) return []
          return old.filter(s => s.id !== variables.id)
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ["custom-sources"] })
      }
      queryClient.setQueryData(["admin-sources"], (old: AdminSource[] | undefined) => {
        if (!old) return []
        return old.map(s => s.id === variables.id ? { ...s, ...variables } : s)
      })
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
    },
    onSettled: () => {
      setUpdatingDynamicId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await myFetch(`/admin/sources`, {
        method: "DELETE",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["custom-sources"], (old: CustomSourceInfo[] | undefined) => {
        if (!old) return []
        return old.filter(s => s.id !== deletedId)
      })
      queryClient.setQueryData(["admin-sources"], (old: AdminSource[] | undefined) => {
        if (!old) return []
        return old.filter(s => s.id !== deletedId)
      })
      refetch()
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
    },
  })

  const [editingSource, setEditingSource] = useState<AdminSource | null>(null)
  const [showForm, setShowForm] = useState(false)

  if (!enableLogin || !loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <span className="i-ph:lock-duotone text-3xl op-20" />
        <p className="text-sm op-40 tracking-wide">請先登入 GitHub 帳號</p>
        <Link to="/" className="text-xs op-50 hover:op-80 transition-opacity">
          返回首頁
        </Link>
      </div>
    )
  }

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="i-ph:circle-dashed-duotone text-xl animate-spin op-20" />
      </div>
    )
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <span className="i-ph:shield-warning-duotone text-3xl op-20" />
        <p className="text-sm op-40 tracking-wide">你沒有管理員權限</p>
        <Link to="/" className="text-xs op-50 hover:op-80 transition-opacity">
          返回首頁
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-xl font-medium tracking-tight op-90">來源管理</h1>
          <p className="text-xs op-30 mt-1">管理動態與靜態來源的分類、權重與顯隱</p>
        </div>
        <div className="flex items-center gap-3">
          {!showForm && !editingSource && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-xs px-3 py-1.5 rounded-md border border-white/8 op-60 hover:op-100 hover:border-white/20 transition-all duration-300"
            >
              新增來源
            </button>
          )}
          <Link to="/" className="text-xs op-30 hover:op-60 transition-opacity duration-300">
            返回首頁
          </Link>
        </div>
      </div>

      {/* Add / Edit form - collapsed by default */}
      <AnimatePresence>
        {(showForm || editingSource) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden mb-10"
          >
            <AddSourceForm
              editingSource={editingSource}
              onSubmit={(data) => {
                if (editingSource) {
                  updateMutation.mutate({ id: editingSource.id, ...data })
                  setEditingSource(null)
                } else {
                  createMutation.mutate(data)
                }
                setShowForm(false)
              }}
              onCancelEdit={() => {
                setEditingSource(null)
                setShowForm(false)
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
              error={createMutation.error || updateMutation.error}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic sources */}
      {allSources.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-sm font-medium op-60 tracking-wide">動態來源</h2>
            <span className="text-[10px] op-25">{allSources.length} 項</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="i-ph:circle-dashed-duotone text-xl animate-spin op-20" />
            </div>
          ) : (
            <div className="flex flex-col gap-px rounded-xl overflow-hidden border border-white/5">
              {allSources.map(source => (
                <SourceRow
                  key={source.id}
                  source={source}
                  onToggle={() => updateMutation.mutate({
                    id: source.id,
                    is_active: source.is_active ? 0 : 1,
                  })}
                  onEdit={() => {
                    setEditingSource(source)
                    setShowForm(true)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  onDelete={() => {
                    if (confirm(`確定要刪除「${source.name}」嗎？`)) {
                      deleteMutation.mutate(source.id)
                    }
                  }}
                  isUpdating={updatingDynamicId === source.id}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Static sources */}
      <StaticSourceManager isAdmin={adminCheck?.isAdmin === true} />

      {/* Category preview */}
      {adminCheck?.isAdmin && <CategoryPreview />}
    </div>
  )
}

// ────────────────────────────────────────────────
// Static Source Manager
// ────────────────────────────────────────────────
function StaticSourceManager({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const { loggedIn } = useLogin()
  const [expanded, setExpanded] = useState(false)

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["source-overrides-admin"],
    queryFn: async () => {
      const res: { source_id: string, is_hidden: number, is_mainstream_media?: number, priority_weight?: number, tags?: string, badge_label?: string }[] = await myFetch("/admin/source-overrides", {
        headers: getAuthHeaders(),
      })
      return res
    },
    enabled: !!isAdmin && loggedIn,
    retry: false,
  })

  const staticSourcesList = useMemo(() => {
    return typeSafeObjectEntries(sources).map(([id, s]) => {
      const override = overrides.find(o => o.source_id === id)
      return {
        id: id as string,
        name: s.name,
        color: s.color,
        column_id: s.column,
        type: s.type,
        is_active: override?.is_hidden === 1 ? 0 : 1,
        override,
      }
    })
  }, [overrides])

  const [savingId, setSavingId] = useState<string | null>(null)

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_hidden, is_mainstream_media, priority_weight, tags, badge_label }: any) => {
      setSavingId(id)
      return await myFetch("/admin/source-overrides", {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_hidden, is_mainstream_media, priority_weight, tags, badge_label }),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["source-overrides-admin"], (old: any[] | undefined) => {
        const payload = {
          source_id: variables.id,
          is_hidden: variables.is_hidden,
          is_mainstream_media: variables.is_mainstream_media,
          priority_weight: variables.priority_weight,
          tags: variables.tags,
          badge_label: variables.badge_label,
        }
        if (!old) return [payload]
        const existing = old.findIndex(o => o.source_id === variables.id)
        if (existing > -1) {
          const newArr = [...old]
          newArr[existing] = { ...old[existing], ...payload }
          return newArr
        }
        return [...old, payload]
      })
      queryClient.setQueryData(["source-overrides"], (old: string[] | undefined) => {
        const hiddenSet = new Set(old || [])
        if (variables.is_hidden === 1) hiddenSet.add(variables.id)
        else hiddenSet.delete(variables.id)
        return Array.from(hiddenSet)
      })
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
    },
    onSettled: () => {
      setSavingId(null)
    },
  })

  const visibleSources = expanded ? staticSourcesList : staticSourcesList.slice(0, STATIC_COLLAPSED_COUNT)
  const hiddenCount = staticSourcesList.length - STATIC_COLLAPSED_COUNT

  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-medium op-60 tracking-wide">靜態來源</h2>
        <span className="text-[10px] op-25">{staticSourcesList.length} 項</span>
      </div>
      <p className="text-[11px] op-25 mb-6">權重越大排越前。訪客可在首頁拖曳自訂順序（僅本機）。</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="i-ph:circle-dashed-duotone text-xl animate-spin op-20" />
        </div>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-xl overflow-hidden border border-white/5">
            <AnimatePresence initial={false}>
              {visibleSources.map(source => (
                <StaticSourceRow
                  key={source.id}
                  source={source}
                  onToggle={() => toggleMutation.mutate({
                    id: source.id,
                    is_hidden: source.is_active ? 1 : 0,
                    is_mainstream_media: source.override?.is_mainstream_media ?? -1,
                    priority_weight: source.override?.priority_weight ?? 0,
                    tags: source.override?.tags ?? "[]",
                    badge_label: source.override?.badge_label ?? "",
                  })}
                  onUpdateTraits={(traits: any) => toggleMutation.mutateAsync({
                    id: source.id,
                    is_hidden: source.is_active ? 0 : 1,
                    ...traits,
                  })}
                  isSaving={savingId === source.id}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Fade-out gradient + expand trigger */}
          {!expanded && hiddenCount > 0 && (
            <div className="relative mt-0">
              <div className="absolute -top-16 left-0 right-0 h-16 bg-gradient-to-t from-base to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full py-3 text-center text-[11px] op-30 hover:op-60 transition-opacity duration-300"
              >
                展開其餘 {hiddenCount} 項
              </button>
            </div>
          )}
          {expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="w-full py-3 text-center text-[11px] op-30 hover:op-60 transition-opacity duration-300"
            >
              收合
            </button>
          )}
        </div>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────
// Static Source Row (hover-reveal editing)
// ────────────────────────────────────────────────
function StaticSourceRow({ source, onToggle, onUpdateTraits, isSaving }: {
  source: any
  onToggle: () => void
  onUpdateTraits: (traits: any) => Promise<any>
  isSaving: boolean
}) {
  const override = source.override || {}

  const [isMainstream, setIsMainstream] = useState(String(override.is_mainstream_media ?? -1))
  const [weight, setWeight] = useState(String(override.priority_weight ?? 0))
  const [badgeLabel, setBadgeLabel] = useState(override.badge_label ?? "")
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(override.tags || "[]").join(", ") }
    catch { return "" }
  })
  const [isOpen, setIsOpen] = useState(false)

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const inFlightRef = useRef(false)
  const pendingPayloadRef = useRef<any>(null)
  const debounceRef = useRef<any>(null)
  const lastSyncedRef = useRef<string>("")

  useEffect(() => {
    const fingerprint = JSON.stringify({
      m: override.is_mainstream_media,
      w: override.priority_weight,
      b: override.badge_label,
      t: override.tags,
    })
    if (fingerprint === lastSyncedRef.current) return
    lastSyncedRef.current = fingerprint
    if (saveStatus === "saving") return

    setIsMainstream(String(override.is_mainstream_media ?? -1))
    setWeight(String(override.priority_weight ?? 0))
    setBadgeLabel(override.badge_label ?? "")
    try { setTags(JSON.parse(override.tags || "[]").join(", ")) } catch { setTags("") }
  }, [override, saveStatus])

  const processQueue = useCallback(async () => {
    if (inFlightRef.current || !pendingPayloadRef.current) return
    inFlightRef.current = true
    const payload = pendingPayloadRef.current
    pendingPayloadRef.current = null
    setSaveStatus("saving")
    setErrorMsg("")
    try {
      await onUpdateTraits(payload)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus(prev => prev === "saved" ? "idle" : prev), 2000)
    } catch (err: any) {
      setSaveStatus("error")
      setErrorMsg(err.message || "儲存失敗")
    } finally {
      inFlightRef.current = false
      if (pendingPayloadRef.current) processQueue()
    }
  }, [onUpdateTraits])

  const normalizeTags = (raw: string): string[] => {
    const seen = new Set<string>()
    return raw.split(',').map(t => t.trim()).filter(Boolean).filter(t => {
      const key = t.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const handleBlur = () => {
    const parsedWeight = parseInt(weight, 10)
    pendingPayloadRef.current = {
      is_mainstream_media: Number(isMainstream),
      priority_weight: Number.isFinite(parsedWeight) ? parsedWeight : 0,
      tags: JSON.stringify(normalizeTags(tags)),
      badge_label: badgeLabel.trim(),
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => processQueue(), 400)
  }

  const disabled = isSaving || saveStatus === "saving"

  const weightNum = Number(weight) || 0
  const mainstreamNum = Number(isMainstream)

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={$(
        "group relative flex flex-col transition-all duration-300",
        "bg-white/[0.02] hover:bg-white/[0.05]",
        !source.is_active && "op-40",
      )}
    >
      {/* Primary row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-7 h-7 rounded-full bg-cover bg-center flex-shrink-0 border border-white/8"
          style={{ backgroundImage: `url(/icons/${source.id.split('-')[0]}.png)` }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium op-85 truncate">{source.name}</span>
            {/* Inline indicators: only show non-default / exception states */}
            {!source.is_active && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 op-50">隱藏</span>
            )}
            {mainstreamNum === 1 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 op-40">新聞</span>
            )}
            {weightNum !== 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 op-30 font-mono">{weightNum}</span>
            )}
            {/* Save status */}
            {saveStatus === "saving" && <span className="text-[9px] op-40 animate-pulse">...</span>}
            {saveStatus === "saved" && <span className="text-[9px] op-30">saved</span>}
            {saveStatus === "error" && <span className="text-[9px] text-red-400/60" title={errorMsg}>error</span>}
          </div>
        </div>

        {/* Hover-reveal actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="op-35 hover:op-80 transition-all duration-300 text-xs p-1"
            title="編輯屬性"
          >
            <span className="i-ph:sliders-horizontal-duotone text-sm inline-block" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className={$(
              "relative w-8 h-[18px] rounded-full transition-all duration-300 cursor-pointer flex-shrink-0",
              source.is_active ? "bg-white/15" : "bg-white/5",
            )}
          >
            <span
              className={$(
                "absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all duration-300",
                source.is_active ? "left-[15px] bg-white/70" : "left-[2px] bg-white/25",
              )}
            />
          </button>
        </div>
      </div>

      {/* Expandable editing panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] border-t border-white/5">
              <label className="flex items-center gap-1.5 op-50 hover:op-80 transition-opacity">
                <span className="op-60">歸屬</span>
                <select
                  value={isMainstream}
                  onChange={(e) => setIsMainstream(e.target.value)}
                  onBlur={handleBlur}
                  disabled={disabled}
                  className="bg-transparent border-b border-white/10 outline-none text-center py-0.5 focus:border-white/30 transition-colors"
                >
                  <option value="-1">依系統</option>
                  <option value="1">加入新聞</option>
                  <option value="0">排除新聞</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 op-50 hover:op-80 transition-opacity" title="站方預設排序；訪客可在首頁自行拖曳">
                <span className="op-60">權重</span>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onBlur={handleBlur}
                  disabled={disabled}
                  className="bg-transparent border-b border-white/10 outline-none w-10 text-center py-0.5 focus:border-white/30 transition-colors font-mono"
                />
              </label>
              <label className="flex items-center gap-1.5 op-50 hover:op-80 transition-opacity">
                <span className="op-60">Badge</span>
                <input
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value)}
                  onBlur={handleBlur}
                  disabled={disabled}
                  placeholder="—"
                  className="bg-transparent border-b border-white/10 outline-none w-14 text-center py-0.5 focus:border-white/30 transition-colors"
                />
              </label>
              <label className="flex flex-1 items-center gap-1.5 op-50 hover:op-80 transition-opacity min-w-0">
                <span className="op-60 flex-shrink-0">標籤</span>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBlur() } }}
                  disabled={disabled}
                  placeholder="news, ai"
                  className="bg-transparent border-b border-white/10 outline-none flex-1 min-w-0 py-0.5 focus:border-white/30 transition-colors"
                />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ────────────────────────────────────────────────
// Add / Edit Source Form
// ────────────────────────────────────────────────
function AddSourceForm({ onSubmit, onCancelEdit, editingSource, isLoading, error }: {
  onSubmit: (data: Record<string, any>) => void
  onCancelEdit: () => void
  editingSource: AdminSource | null
  isLoading: boolean
  error: Error | null
}) {
  const [name, setName] = useState("")
  const [subdomain, setSubdomain] = useState("")
  const [type, setType] = useState("")
  const [columnId, setColumnId] = useState("world")
  const [color, setColor] = useState("blue")
  const [isMainstream, setIsMainstream] = useState(0)
  const [priorityWeight, setPriorityWeight] = useState(0)
  const [tags, setTags] = useState("")
  const [badgeLabel, setBadgeLabel] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (editingSource) {
      setName(editingSource.name)
      setSubdomain(editingSource.subdomain)
      setType(editingSource.type)
      setColumnId(editingSource.column_id)
      setColor(editingSource.color)
      setIsMainstream(editingSource.is_mainstream_media ?? 0)
      setPriorityWeight(editingSource.priority_weight ?? 0)
      setBadgeLabel(editingSource.badge_label ?? "")
      try { setTags(JSON.parse(editingSource.tags || "[]").join(", ")) } catch { setTags("") }
      setShowAdvanced(true)
    } else {
      setName(""); setSubdomain(""); setType(""); setColumnId("world"); setColor("blue")
      setIsMainstream(0); setPriorityWeight(0); setTags(""); setBadgeLabel("")
      setShowAdvanced(false)
    }
  }, [editingSource])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !subdomain.trim()) return
    const seen = new Set<string>()
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean).filter(t => {
      const key = t.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    onSubmit({
      name: name.trim(), subdomain: subdomain.trim(), type, column_id: columnId, color,
      is_mainstream_media: isMainstream, priority_weight: priorityWeight,
      tags: JSON.stringify(parsedTags), badge_label: badgeLabel.trim(),
    })
    if (!editingSource) {
      setName(""); setSubdomain(""); setType(""); setColumnId("world"); setColor("blue")
      setIsMainstream(0); setPriorityWeight(0); setTags(""); setBadgeLabel("")
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-md bg-white/[0.03] border border-white/8 outline-none focus:border-white/20 transition-all duration-300 text-sm placeholder:op-25"
  const labelClass = "text-[11px] op-40 mb-1.5 block tracking-wide"

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded-xl border border-white/8 bg-white/[0.02]"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium op-70">
          {editingSource ? `編輯：${editingSource.name}` : "新增來源"}
        </h2>
        <button
          type="button"
          onClick={onCancelEdit}
          className="text-[11px] op-30 hover:op-60 transition-opacity duration-300"
        >
          取消
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>名稱</label>
          <input className={inputClass} placeholder="BBC" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Subdomain</label>
          <div className="flex items-center gap-2">
            <input className={inputClass} placeholder="bbc" value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required />
            <span className="text-[10px] op-20 whitespace-nowrap">.buzzing.cc</span>
          </div>
        </div>
        <div>
          <label className={labelClass}>模式</label>
          <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
            <option value="">時間流</option>
            <option value="hottest">熱榜</option>
            <option value="realtime">快訊</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>區域</label>
          <select className={inputClass} value={columnId} onChange={e => setColumnId(e.target.value)}>
            <option value="world">國際</option>
            <option value="china">國內</option>
            <option value="tech">科技</option>
            <option value="finance">財經</option>
          </select>
        </div>
      </div>

      {/* Collapsible advanced section */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-5 text-[11px] op-25 hover:op-50 transition-opacity duration-300"
      >
        {showAdvanced ? "收起進階設定" : "進階設定"}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4 pt-4 border-t border-white/5">
              <div>
                <label className={labelClass}>
                  <input type="checkbox" className="mr-2 accent-white/50" checked={isMainstream === 1} onChange={e => setIsMainstream(e.target.checked ? 1 : 0)} />
                  加入新聞分頁
                </label>
              </div>
              <div>
                <label className={labelClass}>排序權重</label>
                <input type="number" className={inputClass} value={priorityWeight} onChange={e => setPriorityWeight(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>標籤</label>
                <input className={inputClass} value={tags} placeholder="ai, web3" onChange={e => setTags(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Badge</label>
                <input className={inputClass} value={badgeLabel} placeholder="—" onChange={e => setBadgeLabel(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>顏色</label>
                <select className={inputClass} value={color} onChange={e => setColor(e.target.value)}>
                  {["blue", "red", "green", "orange", "gray", "teal", "indigo", "emerald", "slate"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <CategoryPrediction type={type} isMainstream={isMainstream} tags={tags} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-4 text-[11px] text-red-400/70">
          {(error as any)?.data?.message || error.message}
        </p>
      )}

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={isLoading || !name.trim() || !subdomain.trim()}
          className={$(
            "px-5 py-2 rounded-md text-xs font-medium transition-all duration-300",
            "border border-white/10 hover:border-white/25 hover:bg-white/5",
            (isLoading || !name.trim() || !subdomain.trim()) && "op-20 cursor-not-allowed",
          )}
        >
          {isLoading ? "處理中..." : editingSource ? "儲存" : "新增"}
        </button>
      </div>
    </form>
  )
}

// ────────────────────────────────────────────────
// Dynamic Source Row (hover-reveal actions)
// ────────────────────────────────────────────────
function SourceRow({ source, onToggle, onDelete, onEdit, isUpdating }: {
  source: AdminSource
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  isUpdating: boolean
}) {
  return (
    <div
      className={$(
        "group flex items-center gap-4 px-4 py-3 transition-all duration-300",
        "bg-white/[0.02] hover:bg-white/[0.05]",
        !source.is_active && "op-35",
      )}
    >
      <div
        className="w-8 h-8 rounded-full bg-cover bg-center flex-shrink-0 border border-white/8"
        style={{ backgroundImage: `url(https://${source.subdomain}.buzzing.cc/icon.png)` }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium op-85 truncate">{source.name}</span>
          <span className="text-[10px] op-25 font-mono">{source.subdomain}</span>
          {/* Exception-only badges */}
          {!source.is_active && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 op-50">停用</span>
          )}
          {source.is_mainstream_media === 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 op-30">新聞</span>
          )}
          {source.priority_weight !== undefined && source.priority_weight !== 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 op-25 font-mono">{source.priority_weight}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] op-25 font-mono">{source.id}</span>
          <SourceTagsBadges tags={source.tags} name={source.name} subdomain={source.subdomain} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onEdit}
          disabled={isUpdating}
          className="p-1.5 rounded-md hover:bg-white/8 transition-colors duration-200 op-40 hover:op-90"
          title="編輯"
        >
          <span className="i-ph:pencil-simple-duotone text-sm inline-block" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isUpdating}
          className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors duration-200 op-25 hover:op-70 hover:text-red-400"
          title="刪除"
        >
          <span className="i-ph:trash-duotone text-sm inline-block" />
        </button>
      </div>

      {/* Toggle: always visible but minimal */}
      <button
        type="button"
        onClick={onToggle}
        disabled={isUpdating}
        className={$(
          "relative w-8 h-[18px] rounded-full transition-all duration-300 cursor-pointer flex-shrink-0",
          source.is_active ? "bg-white/15" : "bg-white/5",
        )}
      >
        <span
          className={$(
            "absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all duration-300",
            source.is_active ? "left-[15px] bg-white/70" : "left-[2px] bg-white/25",
          )}
        />
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────
// Category Preview (collapsible per bucket)
// ────────────────────────────────────────────────
function CategoryPreview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["source-categories-preview"],
    queryFn: async () => {
      return await myFetch("/source-categories", {
        headers: getAuthHeaders(),
      })
    },
    retry: false,
  })

  if (isLoading) {
    return (
      <section className="mb-14">
        <h2 className="text-sm font-medium op-60 tracking-wide mb-6">分類預覽</h2>
        <div className="flex justify-center py-12">
          <span className="i-ph:circle-dashed-duotone text-xl animate-spin op-20" />
        </div>
      </section>
    )
  }

  if (error || !data?.categories) {
    return (
      <section className="mb-14">
        <h2 className="text-sm font-medium op-60 tracking-wide mb-6">分類預覽</h2>
        <p className="text-[11px] op-30">載入失敗</p>
      </section>
    )
  }

  const { categories, metadata } = data

  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-medium op-60 tracking-wide">分類預覽</h2>
      </div>
      <p className="text-[11px] op-25 mb-6">反映資料庫排序推導後的最終分頁歸屬</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
        <PreviewBucket title="新聞" ids={categories.news || []} metadata={metadata} />
        <PreviewBucket title="全部" ids={categories.more || []} metadata={metadata} />
        <PreviewBucket title="熱榜" ids={categories.hottest || []} metadata={metadata} />
        <PreviewBucket title="快訊" ids={categories.realtime || []} metadata={metadata} />
      </div>
    </section>
  )
}

function PreviewBucket({ title, ids, metadata }: { title: string, ids: string[], metadata: Record<string, any> }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? ids : ids.slice(0, PREVIEW_COLLAPSED_COUNT)
  const hiddenCount = ids.length - PREVIEW_COLLAPSED_COUNT

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.015] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium op-60">{title}</span>
        <span className="text-[10px] op-20 font-mono">{ids.length}</span>
      </div>

      {ids.length === 0 ? (
        <div className="text-[10px] op-20 text-center py-6">空</div>
      ) : (
        <div className="relative">
          <div className="flex flex-col">
            {visible.map((id: string) => {
              const m = metadata?.[id]
              return (
                <div key={id} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.03] transition-colors duration-200">
                  <div
                    className="w-4 h-4 rounded-full bg-cover bg-center flex-shrink-0"
                    style={{ backgroundImage: `url(${m?.isDynamic ? m.home.replace(/\/$/, '') + '/icon.png' : `/icons/${id.split('-')[0]}.png`})` }}
                  />
                  <span className="truncate flex-1 op-60">{m?.name || id}</span>
                  {m?.isDynamic && <span className="text-[8px] op-20">dyn</span>}
                </div>
              )
            })}
          </div>

          {!expanded && hiddenCount > 0 && (
            <>
              <div className="absolute bottom-6 left-0 right-0 h-8 bg-gradient-to-t from-base to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full py-2 text-center text-[10px] op-20 hover:op-50 transition-opacity duration-300"
              >
                +{hiddenCount}
              </button>
            </>
          )}
          {expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="w-full py-2 text-center text-[10px] op-20 hover:op-50 transition-opacity duration-300"
            >
              收合
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────
// Inline prediction (form)
// ────────────────────────────────────────────────
function CategoryPrediction({ type, isMainstream, tags }: { type: string, isMainstream: number, tags: string }) {
  const parsedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
  const isNews = isMainstream === 1 || parsedTags.includes("news")
  const isHottest = type === "hottest"
  const isRealtime = type === "realtime"

  const items: { label: string, active: boolean }[] = [
    { label: "全部", active: true },
    { label: "新聞", active: isNews },
    { label: "熱榜", active: isHottest },
    { label: "快訊", active: isRealtime },
  ]

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[10px] op-25">歸屬：</span>
      {items.map(item => (
        <span
          key={item.label}
          className={$(
            "text-[10px] px-2 py-0.5 rounded-full transition-all duration-300",
            item.active ? "bg-white/8 op-60" : "op-15 line-through",
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────
// Tag badges (dedup)
// ────────────────────────────────────────────────
function SourceTagsBadges({ tags, name, subdomain }: { tags?: string, name: string, subdomain: string }) {
  let parsed: string[] = []
  try {
    if (tags && tags !== "[]") parsed = JSON.parse(tags)
  } catch { /* ignore */ }
  if (!Array.isArray(parsed)) parsed = []

  const nameLower = name.toLowerCase()
  const subLower = subdomain.toLowerCase()
  const dedupTags = parsed.filter(t => {
    const tl = t.toLowerCase()
    return tl !== nameLower && tl !== subLower
  })

  if (dedupTags.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {dedupTags.map(t => (
        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 op-30">{t}</span>
      ))}
    </div>
  )
}
