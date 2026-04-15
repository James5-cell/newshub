import { useState, useEffect } from "react"
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

function getAuthHeaders() {
  const jwt = safeParseString(localStorage.getItem("jwt"))
  return jwt ? { Authorization: `Bearer ${jwt}` } : {}
}

function AdminPage() {
  const { loggedIn, enableLogin } = useLogin()
  const queryClient = useQueryClient()

  // 檢查是否為 Admin
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

  // 拉取所有源（含 inactive）
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

  // 新增
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

  // 更新（含 toggle active）
  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
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
      refetch()
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
    },
  })

  // 刪除
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

  // ── 權限守衛 ──
  if (!enableLogin || !loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="i-ph:lock-duotone text-4xl op-30" />
        <p className="text-lg op-50">請先登入 GitHub 帳號</p>
        <Link to="/" className="btn text-sm px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20">
          返回首頁
        </Link>
      </div>
    )
  }

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="i-ph:circle-dashed-duotone text-2xl animate-spin op-30" />
      </div>
    )
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="i-ph:shield-warning-duotone text-4xl op-30" />
        <p className="text-lg op-50">你沒有管理員權限</p>
        <Link to="/" className="btn text-sm px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20">
          返回首頁
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="i-ph:gear-six-duotone" />
          動態來源管理
        </h1>
        <Link to="/" className="btn text-sm px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center gap-1">
          <span className="i-ph:arrow-left" />
          返回首頁
        </Link>
      </div>

      {/* ── 新增 / 編輯 表單 ── */}
      <AddSourceForm
        editingSource={editingSource}
        onSubmit={(data) => {
          if (editingSource) {
            updateMutation.mutate({ id: editingSource.id, ...data })
            setEditingSource(null)
          } else {
            createMutation.mutate(data)
          }
        }}
        onCancelEdit={() => setEditingSource(null)}
        isLoading={createMutation.isPending || updateMutation.isPending}
        error={createMutation.error || updateMutation.error}
      />

      {/* ── 來源列表 ── */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="i-ph:list-bullets-duotone" />
          已設定來源
          <span className="text-sm op-50 font-normal">({allSources.length})</span>
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="i-ph:circle-dashed-duotone text-2xl animate-spin op-30" />
          </div>
        ) : allSources.length === 0 ? (
          <div className="text-center py-12 op-40">
            <span className="i-ph:database-duotone text-4xl block mb-2" />
            <p>尚未新增任何動態來源</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-3">
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
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  onDelete={() => {
                    if (confirm(`確定要刪除 "${source.name}" 嗎？\n注意：這無法復原！`)) {
                      deleteMutation.mutate(source.id)
                    }
                  }}
                  isUpdating={updateMutation.isPending}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── 靜態來源管理 ── */}
      <StaticSourceManager isAdmin={adminCheck?.isAdmin === true} />

      {/* ── 即時分類預覽 ── */}
      {adminCheck?.isAdmin && <CategoryPreview />}
    </div>
  )
}

function StaticSourceManager({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const { loggedIn } = useLogin()

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["source-overrides-admin"],
    queryFn: async () => {
      const res: { source_id: string, is_hidden: number, is_mainstream_media?: number, priority_weight?: number, tags?: string }[] = await myFetch("/admin/source-overrides", {
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
        override // pass internal reference for traits editing
      }
    })
  }, [overrides])

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_hidden, is_mainstream_media, priority_weight, tags }: any) => {
      return await myFetch("/admin/source-overrides", {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_hidden, is_mainstream_media, priority_weight, tags }),
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
          badge_label: variables.badge_label
        }
        if (!old) return [payload]
        const existing = old.findIndex(o => o.source_id === variables.id)
        if (existing > -1) {
          const newArr = [...old]
          newArr[existing] = payload
          return newArr
        }
        return [...old, payload]
      })
      // 同步更新前端 hook 的快取
      queryClient.setQueryData(["source-overrides"], (old: string[] | undefined) => {
        const hiddenSet = new Set(old || [])
        if (variables.is_hidden === 1) hiddenSet.add(variables.id)
        else hiddenSet.delete(variables.id)
        return Array.from(hiddenSet)
      })
      queryClient.invalidateQueries({ queryKey: ["source-overrides-admin"] })
      queryClient.invalidateQueries({ queryKey: ["source-overrides"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
    },
  })

  return (
    <div className="mt-12 pt-8 border-t border-primary/10">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
        <span className="i-ph:cube-duotone" />
        靜態來源管理
      </h2>
      <p className="text-sm op-50 mb-6">可在此隱藏系統預設的靜態新聞來源 (shared/sources.json)。</p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="i-ph:circle-dashed-duotone text-2xl animate-spin op-30" />
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {staticSourcesList.map(source => (
              <StaticSourceRow
                key={source.id}
                source={source}
                onToggle={() => toggleMutation.mutate({
                  id: source.id,
                  is_hidden: source.is_active ? 1 : 0,
                  is_mainstream_media: source.override?.is_mainstream_media ?? -1,
                  priority_weight: source.override?.priority_weight ?? 0,
                  tags: source.override?.tags ?? "[]",
                  badge_label: source.override?.badge_label ?? ""
                })}
                onUpdateTraits={(traits: any) => toggleMutation.mutateAsync({
                  id: source.id,
                  is_hidden: source.is_active ? 0 : 1,
                  ...traits
                })}
                isUpdating={toggleMutation.isPending}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}

function StaticSourceRow({ source, onToggle, onUpdateTraits, isUpdating }: any) {
  const columnLabels: Record<string, string> = {
    world: "國際",
    china: "國內",
    tech: "科技",
    finance: "財經",
  }

  const typeLabels: Record<string, string> = {
    hottest: "熱榜",
    realtime: "快訊",
    "": "時間流",
  }

  const override = source.override || {}
  const [isMainstream, setIsMainstream] = useState(override.is_mainstream_media ?? -1)
  const [weight, setWeight] = useState(override.priority_weight ?? 0)
  const [badgeLabel, setBadgeLabel] = useState(override.badge_label ?? "")
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(override.tags || "[]").join(", ") }
    catch { return "" }
  })

  // UX Feedback and dedup states
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const inFlightRef = useRef(false)
  const pendingPayloadRef = useRef<any>(null)
  const debounceRef = useRef<any>(null)

  useEffect(() => {
    setIsMainstream(override.is_mainstream_media ?? -1)
    setWeight(override.priority_weight ?? 0)
    setBadgeLabel(override.badge_label ?? "")
    try { setTags(JSON.parse(override.tags || "[]").join(", ")) } catch { setTags("") }
  }, [override])

  const processQueue = async () => {
    if (inFlightRef.current || !pendingPayloadRef.current) return
    
    inFlightRef.current = true
    const payload = pendingPayloadRef.current
    pendingPayloadRef.current = null
    
    setSaveStatus("saving")
    setErrorMsg("")
    try {
      await onUpdateTraits(payload)
      setSaveStatus("saved")
      setTimeout(() => {
        setSaveStatus(prev => prev === "saved" ? "idle" : prev)
      }, 2000)
    } catch (err: any) {
      setSaveStatus("error")
      setErrorMsg(err.message || "儲存失敗")
    } finally {
      inFlightRef.current = false
      if (pendingPayloadRef.current) {
        processQueue() // Pick up the latest overwritten payload
      }
    }
  }

  // Normalize tags: split, trim, filter, case-insensitive dedup
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
    pendingPayloadRef.current = {
      is_mainstream_media: Number(isMainstream),
      priority_weight: Number(weight) || 0,
      tags: JSON.stringify(normalizeTags(tags)),
      badge_label: badgeLabel.trim()
    }
    
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      processQueue()
    }, 400)
  }

  return (
    <motion.div
      layout
      className={$(
        "flex flex-col gap-3 p-3 rounded-xl transition-all",
        "border border-primary/10 relative",
        source.is_active ? "bg-primary/5" : "bg-neutral/5 op-60",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full bg-cover bg-center flex-shrink-0 border-2 border-primary/10"
          style={{ backgroundImage: `url(/icons/${source.id.split('-')[0]}.png)` }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{source.name}</span>
            <span className="text-[10px] op-50">
              {columnLabels[source.column_id] || source.column_id}
              {source.type ? ` · ${typeLabels[source.type] || source.type}` : " · 時間流"}
            </span>
            {/* Status indicator */}
            {saveStatus === "saving" && <span className="text-[10px] text-blue-500 font-medium whitespace-nowrap bg-blue-500/10 px-1.5 rounded animate-pulse">儲存中...</span>}
            {saveStatus === "saved" && <span className="text-[10px] text-green-500 font-medium whitespace-nowrap bg-green-500/10 px-1.5 rounded">儲存成功</span>}
            {saveStatus === "error" && <span className="text-[10px] text-red-500 font-medium whitespace-nowrap bg-red-500/10 px-1.5 rounded" title={errorMsg}>儲存失敗</span>}
          </div>
          <div className="text-[10px] op-40 mt-0.5">{source.id}</div>
        </div>
        <div className="flex items-center flex-shrink-0">
          <button
            type="button"
            onClick={onToggle}
            disabled={isUpdating}
            className={$(
              "relative w-9 h-5 rounded-full transition-colors cursor-pointer",
              source.is_active ? "bg-green-500/30" : "bg-neutral-400/20",
            )}
            title={source.is_active ? "隱藏來源" : "顯示來源"}
          >
            <span
              className={$(
                "absolute top-0.5 w-4 h-4 rounded-full transition-all",
                source.is_active ? "left-4.5 bg-green-500" : "left-0.5 bg-neutral-400",
              )}
            />
          </button>
        </div>
      </div>
      
      {/* ── 分類歸屬 ── */}
      <div className="flex flex-col gap-2 mt-1 text-xs px-2">
        {/* System tags (readonly) */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] op-40">系統：</span>
          {source.type === "hottest" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">熱榜</span>}
          {source.type === "realtime" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600">快訊</span>}
          {!source.type && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral/10 op-50">時間流</span>}
        </div>
        {/* Editable inline fields */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1 op-80">
            新聞歸屬:
            <select 
              value={isMainstream} 
              onChange={(e) => setIsMainstream(e.target.value)} 
              onBlur={handleBlur}
              disabled={isUpdating || saveStatus === "saving"}
              className="bg-transparent border-b border-primary/30 outline-none text-center"
            >
              <option value="-1">依系統</option>
              <option value="1">加入新聞</option>
              <option value="0">排除新聞</option>
            </select>
          </label>
          <label className="flex items-center gap-1 op-80">
            權重:
            <input 
              type="number" 
              value={weight} 
              onChange={(e) => setWeight(e.target.value)} 
              onBlur={handleBlur}
              disabled={isUpdating || saveStatus === "saving"}
              className="bg-transparent border-b border-primary/30 outline-none w-10 text-center" 
            />
          </label>
          <label className="flex items-center gap-1 op-80">
            Badge:
            <input 
              value={badgeLabel} 
              onChange={(e) => setBadgeLabel(e.target.value)} 
              onBlur={handleBlur}
              disabled={isUpdating || saveStatus === "saving"}
              placeholder="留空不顯示"
              className="bg-transparent border-b border-primary/30 outline-none w-16 text-center" 
            />
          </label>
          <label className="flex flex-1 items-center gap-1 op-80">
            標籤:
            <input 
              value={tags} 
              onChange={(e) => setTags(e.target.value)} 
              onBlur={handleBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBlur() } }}
              disabled={isUpdating || saveStatus === "saving"}
              placeholder="逗號分隔，如 news, ai"
              className="bg-transparent border-b border-primary/30 outline-none flex-1 min-w-0" 
            />
          </label>
        </div>
      </div>
    </motion.div>
  )
}

// ── 新增來源表單 ──
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

  // Traits
  const [isMainstream, setIsMainstream] = useState(0)
  const [priorityWeight, setPriorityWeight] = useState(0)
  const [tags, setTags] = useState("")
  const [badgeLabel, setBadgeLabel] = useState("")

  // 當傳入編輯對象時，同步到表單
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
    } else {
      setName("")
      setSubdomain("")
      setType("")
      setColumnId("world")
      setColor("blue")
      setIsMainstream(0)
      setPriorityWeight(0)
      setTags("")
      setBadgeLabel("")
    }
  }, [editingSource])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !subdomain.trim()) return
    
    // safe parse tags: split, trim, filter, case-insensitive dedup
    const seen = new Set<string>()
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean).filter(t => {
      const key = t.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    onSubmit({
      name: name.trim(),
      subdomain: subdomain.trim(),
      type,
      column_id: columnId,
      color,
      is_mainstream_media: isMainstream,
      priority_weight: priorityWeight,
      tags: JSON.stringify(parsedTags),
      badge_label: badgeLabel.trim()
    })
    // 提交後不清空，交給上層 onCancelEdit / setEditingSource(null) 來觸發清空
    if (!editingSource) {
      setName("")
      setSubdomain("")
      setType("")
      setColumnId("world")
      setColor("blue")
      setIsMainstream(0)
      setPriorityWeight(0)
      setTags("")
      setBadgeLabel("")
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 outline-none focus:border-primary/30 transition-colors text-sm"
  const labelClass = "text-xs font-medium op-60 mb-1 block"

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-primary/5 border border-primary/10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key={editingSource ? "editing" : "adding"}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold flex items-center gap-2 text-primary">
          {editingSource ? (
            <><span className="i-ph:pencil-simple-duotone text-lg" /> 編輯來源: {editingSource.name}</>
          ) : (
            <><span className="i-ph:plus-circle-duotone text-lg" /> 新增 Buzzing 來源</>
          )}
        </h2>
        {editingSource && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs px-2 py-1 bg-neutral/10 hover:bg-neutral/20 rounded transition-colors"
          >
            取消編輯
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>顯示名稱 *</label>
          <input
            className={inputClass}
            placeholder="例如：BBC"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Subdomain *</label>
          <div className="flex items-center gap-1">
            <input
              className={inputClass}
              placeholder="例如：bbc"
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
            />
            <span className="text-xs op-40 whitespace-nowrap">.buzzing.cc</span>
          </div>
        </div>
        {/* ── A. 內容模式 ── */}
        <div className="md:col-span-2 pt-2 border-t border-primary/10 mt-2">
          <p className="text-xs font-semibold mb-1 op-70 flex items-center gap-1">
            <span className="i-ph:monitor-play-duotone" />
            內容模式
          </p>
          <p className="text-[10px] op-40 mb-3">只影響內容呈現方式，不直接等於新聞分頁歸屬</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>模式</label>
              <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
                <option value="">時間流 — 按時間排列</option>
                <option value="hottest">熱榜 — 按熱度排列</option>
                <option value="realtime">快訊 — 24 小時快訊</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>區域分類</label>
              <select className={inputClass} value={columnId} onChange={e => setColumnId(e.target.value)}>
                <option value="world">國際</option>
                <option value="china">國內</option>
                <option value="tech">科技</option>
                <option value="finance">財經</option>
              </select>
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
        </div>

        {/* ── B. 分類歸屬 ── */}
        <div className="md:col-span-2 pt-2 border-t border-primary/10 mt-2">
          <p className="text-xs font-semibold mb-1 op-70 flex items-center gap-1">
            <span className="i-ph:folders-duotone" />
            分類歸屬
          </p>
          <p className="text-[10px] op-40 mb-3">決定此來源出現在前台的哪些分頁，由新聞歸屬、標籤與系統規則共同決定</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>
                <input 
                  type="checkbox" 
                  className="mr-2" 
                  checked={isMainstream === 1} 
                  onChange={e => setIsMainstream(e.target.checked ? 1 : 0)} 
                />
                新聞分頁歸屬
              </label>
              <p className="text-[10px] op-40 mt-1">勾選後加入「新聞」分頁</p>
            </div>
            <div>
              <label className={labelClass}>排序權重</label>
              <input 
                type="number" 
                className={inputClass} 
                value={priorityWeight} 
                onChange={e => setPriorityWeight(Number(e.target.value) || 0)} 
              />
              <p className="text-[10px] op-40 mt-1">數字越大排越前面（預設 0）</p>
            </div>
            <div>
              <label className={labelClass}>標籤（逗號分隔）</label>
              <input 
                className={inputClass} 
                value={tags} 
                placeholder="例如: ai, web3"
                onChange={e => setTags(e.target.value)} 
              />
            </div>
            <div>
              <label className={labelClass}>Badge 小標籤（可選）</label>
              <input 
                className={inputClass} 
                value={badgeLabel} 
                placeholder="留空則不顯示右側小框"
                onChange={e => setBadgeLabel(e.target.value)} 
              />
              <p className="text-[10px] op-40 mt-1">留空則不顯示右側小框</p>
            </div>
          </div>
        </div>

        {/* ── 即時歸屬預覽 ── */}
        <div className="md:col-span-2 pt-3 mt-1">
          <CategoryPrediction type={type} isMainstream={isMainstream} tags={tags} />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500">
          {(error as any)?.data?.message || error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || !name.trim() || !subdomain.trim()}
        className={$(
          "mt-4 px-5 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-primary/15 hover:bg-primary/25",
          (isLoading || !name.trim() || !subdomain.trim()) && "op-40 cursor-not-allowed",
        )}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="i-ph:circle-dashed-duotone animate-spin" />
            新增中...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="i-ph:plus-bold" />
            新增來源
          </span>
        )}
      </button>
    </motion.form>
  )
}

// ── 來源列表行 ──
function SourceRow({ source, onToggle, onDelete, onEdit, isUpdating }: {
  source: AdminSource
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  isUpdating: boolean
}) {
  const columnLabels: Record<string, string> = {
    world: "國際",
    china: "國內",
    tech: "科技",
    finance: "財經",
  }

  const typeLabels: Record<string, string> = {
    hottest: "熱榜",
    realtime: "快訊",
    "": "時間流",
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={$(
        "flex items-center gap-4 p-4 rounded-xl transition-all",
        "border border-primary/10",
        source.is_active ? "bg-primary/5" : "bg-neutral/5 op-60",
      )}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-full bg-cover bg-center flex-shrink-0 border-2 border-primary/10"
        style={{
          backgroundImage: `url(https://${source.subdomain}.buzzing.cc/icon.png)`,
        }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{source.name}</span>
          <span className={$("text-xs px-1.5 py-0.5 rounded", `bg-${source.color}-500/15 color-${source.color}-500`)}>
            {source.subdomain}
          </span>
          <span className="text-xs op-50">
            {columnLabels[source.column_id] || source.column_id}
          </span>
          <span className="text-xs op-50">
            · {typeLabels[source.type] || source.type}
          </span>
          {source.is_mainstream_media === 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 font-medium">新聞</span>
          )}
          {source.badge_label && source.badge_label.trim().toLowerCase() !== source.name.toLowerCase() && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-600 font-medium whitespace-nowrap">Badge: {source.badge_label}</span>
          )}
          {source.priority_weight !== undefined && source.priority_weight !== 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 font-medium whitespace-nowrap">權重 {source.priority_weight}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="text-xs op-40">
            ID: {source.id}
          </div>
          <SourceTagsBadges tags={source.tags} name={source.name} subdomain={source.subdomain} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Toggle Active */}
        <button
          type="button"
          onClick={onToggle}
          disabled={isUpdating}
          className={$(
            "relative w-11 h-6 rounded-full transition-colors cursor-pointer",
            source.is_active ? "bg-green-500/30" : "bg-neutral-400/20",
          )}
          title={source.is_active ? "停用" : "啟用"}
        >
          <span
            className={$(
              "absolute top-0.5 w-5 h-5 rounded-full transition-all",
              source.is_active ? "left-5.5 bg-green-500" : "left-0.5 bg-neutral-400",
            )}
          />
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={onEdit}
          disabled={isUpdating}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-primary/60 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium"
        >
          <span className="i-ph:pencil-simple-duotone text-base" />
          編輯
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          disabled={isUpdating}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 hover:text-red-500 transition-colors text-xs font-medium"
        >
          <span className="i-ph:trash-duotone text-base" />
          刪除
        </button>
      </div>
    </motion.div>
  )
}

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
      <div className="mt-12 pt-8 border-t border-primary/10">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="i-ph:eye-duotone" />
          即時分類預覽
        </h2>
        <div className="flex justify-center py-8">
          <span className="i-ph:circle-dashed-duotone text-2xl animate-spin op-30" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.categories) {
    return (
      <div className="mt-12 pt-8 border-t border-primary/10">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="i-ph:eye-duotone" />
          即時分類預覽
        </h2>
        <div className="text-red-500 text-sm">載入預覽失敗，請檢查 API 狀態。</div>
      </div>
    )
  }

  const { categories, metadata } = data

  const renderList = (title: string, ids: string[]) => (
    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
      <h3 className="font-semibold text-sm mb-3 flex items-center justify-between">
        {title}
        <span className="op-50 text-xs font-normal">({ids.length})</span>
      </h3>
      {ids.length === 0 ? (
        <div className="text-xs op-40 text-center py-4">無資料</div>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {ids.map((id: string) => {
            const m = metadata?.[id]
            return (
              <div key={id} className="flex items-center gap-2 bg-neutral/5 p-2 rounded-lg text-xs">
                <div className="w-5 h-5 rounded-full bg-cover bg-center flex-shrink-0" 
                     style={{ backgroundImage: `url(${m?.isDynamic ? m.home.replace(/\/$/, '') + '/icon.png' : `/icons/${id.split('-')[0]}.png`})` }} />
                <span className="font-medium truncate flex-1">{m?.name || id}</span>
                {m?.isDynamic && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">動態</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="mt-12 pt-8 border-t border-primary/10">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
        <span className="i-ph:eye-duotone" />
        即時分類預覽
      </h2>
      <p className="text-sm op-50 mb-6">呈現由資料庫排序推導出的最終分類狀態，此區塊反應了當下前台的分類分發邏輯。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
        {renderList("新聞", categories.news || [])}
        {renderList("全部", categories.more || [])}
        {renderList("熱榜", categories.hottest || [])}
        {renderList("快訊", categories.realtime || [])}
      </div>
    </div>
  )
}

// ── 即時歸屬預覽（表單內） ──
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
      <span className="text-[11px] op-50 flex items-center gap-1">
        <span className="i-ph:map-trifold-duotone" />
        將出現在：
      </span>
      {items.map(item => (
        <span
          key={item.label}
          className={$(
            "text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors",
            item.active
              ? "bg-primary/15 text-primary"
              : "bg-neutral/10 op-30 line-through",
          )}
        >
          {item.label}
        </span>
      ))}
      <span className="text-[9px] op-30 ml-auto">實際結果以儲存後的系統分類為準</span>
    </div>
  )
}

// ── 來源列表標籤去重渲染 ──
function SourceTagsBadges({ tags, name, subdomain }: { tags?: string, name: string, subdomain: string }) {
  let parsed: string[] = []
  try {
    if (tags && tags !== "[]") parsed = JSON.parse(tags)
  } catch { /* ignore */ }

  if (!Array.isArray(parsed)) parsed = []

  // 去重：排除與 name/subdomain 相同（大小寫不敏感）的 tag
  const nameLower = name.toLowerCase()
  const subLower = subdomain.toLowerCase()
  const dedupTags = parsed.filter(t => {
    const tl = t.toLowerCase()
    return tl !== nameLower && tl !== subLower
  })

  if (dedupTags.length === 0) {
    return <span className="text-[10px] op-30 italic">未設定標籤</span>
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {dedupTags.map(t => (
        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary/70">{t}</span>
      ))}
    </div>
  )
}

