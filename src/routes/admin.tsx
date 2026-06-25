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
  subdomain?: string
  provider?: string
  feed_url?: string
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

function getAuthHeaders(): Record<string, string> {
  const jwt = safeParseString(localStorage.getItem("jwt"))
  return jwt ? { Authorization: `Bearer ${jwt}` } : {}
}

function AdminPage() {
  const { loggedIn, enableLogin } = useLogin()
  const queryClient = useQueryClient()
  const toaster = useToast()

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
      toaster("新增自訂來源成功", { type: "success" })
      refetch()
      queryClient.invalidateQueries({ queryKey: ["custom-sources"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories"] })
    },
    onError: (err: any) => {
      toaster(err.message || "新增自訂來源失敗", { type: "error" })
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
      toaster("更新自訂來源成功", { type: "success" })
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
      queryClient.invalidateQueries({ queryKey: ["source-categories"] })
    },
    onError: (err: any) => {
      toaster(err.message || "更新自訂來源失敗", { type: "error" })
    },
    onSettled: () => {
      setUpdatingDynamicId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await myFetch(`/admin/sources?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
    },
    onSuccess: (_, deletedId) => {
      toaster("刪除自訂來源成功", { type: "success" })
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
      queryClient.invalidateQueries({ queryKey: ["source-categories"] })
    },
    onError: (err: any) => {
      toaster(err.message || "刪除自訂來源失敗", { type: "error" })
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeletedList, setShowDeletedList] = useState(false)

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["source-overrides-admin"],
    queryFn: async () => {
      const res: { source_id: string, is_hidden: number, is_mainstream_media?: number, priority_weight?: number, tags?: string, badge_label?: string, is_deleted?: number }[] = await myFetch("/admin/source-overrides", {
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
        is_deleted: override?.is_deleted === 1 ? 1 : 0,
        override,
      }
    })
  }, [overrides])

  const activeStaticSources = useMemo(() => {
    return staticSourcesList.filter(s => s.is_deleted === 0)
  }, [staticSourcesList])

  const deletedStaticSources = useMemo(() => {
    return staticSourcesList.filter(s => s.is_deleted === 1)
  }, [staticSourcesList])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids))
  }

  const handleClearSelect = () => {
    setSelectedIds(new Set())
  }

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
      queryClient.invalidateQueries({ queryKey: ["source-categories"] })
    },
    onSettled: () => {
      setSavingId(null)
    },
  })

  const deleteStaticMutation = useMutation({
    mutationFn: async ({ id, is_deleted }: { id: string, is_deleted: number }) => {
      return await myFetch("/admin/source-overrides", {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_deleted }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source-overrides-admin"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
      queryClient.invalidateQueries({ queryKey: ["source-overrides"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories"] })
    }
  })

  const bulkMutation = useMutation({
    mutationFn: async (payload: { ids: string[], is_hidden?: number, is_deleted?: number }) => {
      return await myFetch("/admin/source-overrides", {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk",
          ...payload
        })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source-overrides-admin"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories-preview"] })
      queryClient.invalidateQueries({ queryKey: ["source-overrides"] })
      queryClient.invalidateQueries({ queryKey: ["source-categories"] })
      setSelectedIds(new Set())
    }
  })

  const visibleSources = expanded ? activeStaticSources : activeStaticSources.slice(0, STATIC_COLLAPSED_COUNT)
  const hiddenCount = activeStaticSources.length - STATIC_COLLAPSED_COUNT

  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-medium op-60 tracking-wide">靜態來源</h2>
        <span className="text-[10px] op-25">{activeStaticSources.length} 項啟用</span>
      </div>
      <p className="text-[11px] op-25 mb-4">權重越大排越前。訪客可在首頁拖曳自訂順序（僅本機）。</p>

      {/* Bulk Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 bg-white/[0.015] border border-white/5 rounded-xl p-3.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-white/70">批次操作</span>
          {selectedIds.size > 0 && (
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/90">已選 {selectedIds.size} 項</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size === 0 ? (
            <>
              <button
                type="button"
                onClick={() => handleSelectAll(activeStaticSources.map(s => s.id))}
                className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white/70"
              >
                全選
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("確定要將所有啟用中的靜態來源設為「隱藏」嗎？")) {
                    bulkMutation.mutate({ ids: activeStaticSources.map(s => s.id), is_hidden: 1 })
                  }
                }}
                className="text-[10px] px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 transition-all"
              >
                全部關閉
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkMutation.mutate({ ids: activeStaticSources.map(s => s.id), is_hidden: 0 })
                }}
                className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 transition-all"
              >
                全部開啟
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClearSelect}
                className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white/70"
              >
                取消全選
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkMutation.mutate({ ids: Array.from(selectedIds), is_hidden: 0 })
                }}
                className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 transition-all"
              >
                開啟選中
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkMutation.mutate({ ids: Array.from(selectedIds), is_hidden: 1 })
                }}
                className="text-[10px] px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 transition-all"
              >
                關閉選中
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`確定要將選中的 ${selectedIds.size} 個靜態來源移出您的來源庫嗎？\n(此操作為排除設定，可在下方已移除清單中還原)`)) {
                    bulkMutation.mutate({ ids: Array.from(selectedIds), is_deleted: 1 })
                  }
                }}
                className="text-[10px] px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/20 border border-red-500/25 text-red-300 transition-all"
              >
                移除選中
              </button>
              <button
                type="button"
                onClick={() => {
                  const unselected = activeStaticSources.filter(s => !selectedIds.has(s.id)).map(s => s.id)
                  if (unselected.length === 0) return
                  if (confirm(`確定只保留這 ${selectedIds.size} 個來源，將其餘的 ${unselected.length} 個來源全部移出您的來源庫嗎？`)) {
                    bulkMutation.mutate({ ids: unselected, is_deleted: 1 })
                  }
                }}
                className="text-[10px] px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/20 border border-blue-500/25 text-blue-300 transition-all"
              >
                只保留選中
              </button>
            </>
          )}
        </div>
      </div>

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
                  selected={selectedIds.has(source.id)}
                  onSelect={() => toggleSelect(source.id)}
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
                  onDelete={() => {
                    if (confirm(`確定要將「${source.name}」移出您的來源庫嗎？\n(移除後您仍可在下方已移除清單中還原)`)) {
                      deleteStaticMutation.mutate({ id: source.id, is_deleted: 1 })
                    }
                  }}
                  isSaving={savingId === source.id || deleteStaticMutation.isPending || bulkMutation.isPending}
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

      {/* Deleted / Excluded Drawer Section */}
      {!isLoading && deletedStaticSources.length > 0 && (
        <div className="mt-8 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={() => setShowDeletedList(!showDeletedList)}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <span className={showDeletedList ? "i-ph:caret-down-duotone" : "i-ph:caret-right-duotone"} />
            顯示已移除的來源 ({deletedStaticSources.length})
          </button>

          <AnimatePresence>
            {showDeletedList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-white/[0.01] border border-white/5 rounded-xl p-3 max-h-60 overflow-y-auto font-sans">
                  {deletedStaticSources.map(source => (
                    <div key={source.id} className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-full bg-cover bg-center flex-shrink-0 border border-white/8"
                          style={{ backgroundImage: `url(/icons/${source.id.split('-')[0]}.png)` }}
                        />
                        <span className="text-xs font-medium text-white/60 truncate">{source.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteStaticMutation.mutate({ id: source.id, is_deleted: 0 })}
                        className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 hover:border-white/20 transition-all whitespace-nowrap"
                      >
                        還原
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────
// Static Source Row (hover-reveal editing)
// ────────────────────────────────────────────────
function StaticSourceRow({ source, onToggle, onUpdateTraits, isSaving, selected, onSelect, onDelete }: {
  source: any
  onToggle: () => void
  onUpdateTraits: (traits: any) => Promise<any>
  isSaving: boolean
  selected: boolean
  onSelect: () => void
  onDelete: () => void
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
        "group relative flex flex-col transition-all duration-300 border-b border-white/5",
        "bg-white/[0.02] hover:bg-white/[0.05]",
        !source.is_active && "op-40",
      )}
    >
      {/* Primary row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox for bulk select */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="accent-white/50 cursor-pointer w-3.5 h-3.5"
        />

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
            {saveStatus === "saved" && <span className="text-[9px] op-30 text-green-400">已儲存</span>}
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
            onClick={onDelete}
            className="op-35 hover:op-80 hover:text-red-400 transition-all duration-300 text-xs p-1"
            title="從我的來源庫移除"
          >
            <span className="i-ph:trash-duotone text-sm inline-block" />
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
  const [provider, setProvider] = useState("rss")
  const [feedUrl, setFeedUrl] = useState("")
  const [subdomain, setSubdomain] = useState("")
  const [homeUrl, setHomeUrl] = useState("")
  const [type, setType] = useState("")
  const [columnId, setColumnId] = useState("world")
  const [color, setColor] = useState("blue")
  const [isMainstream, setIsMainstream] = useState(0)
  const [priorityWeight, setPriorityWeight] = useState(0)
  const [tags, setTags] = useState("")
  const [badgeLabel, setBadgeLabel] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Autodiscovery states
  const [inputUrl, setInputUrl] = useState("")
  const [discoveredFeeds, setDiscoveredFeeds] = useState<{ title: string; url: string; type: string }[]>([])
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoverError, setDiscoverError] = useState("")

  useEffect(() => {
    if (editingSource) {
      setName(editingSource.name)
      setProvider(editingSource.provider || "rss")
      setFeedUrl(editingSource.feed_url || "")
      setSubdomain(editingSource.subdomain || "")
      setHomeUrl(editingSource.home_url || "")
      setInputUrl(editingSource.feed_url || editingSource.home_url || "")
      setType(editingSource.type)
      setColumnId(editingSource.column_id)
      setColor(editingSource.color)
      setIsMainstream(editingSource.is_mainstream_media ?? 0)
      setPriorityWeight(editingSource.priority_weight ?? 0)
      setBadgeLabel(editingSource.badge_label ?? "")
      try { setTags(JSON.parse(editingSource.tags || "[]").join(", ")) } catch { setTags("") }
      setShowAdvanced(true)
    } else {
      setName(""); setProvider("rss"); setFeedUrl(""); setSubdomain(""); setHomeUrl(""); setInputUrl("")
      setType(""); setColumnId("world"); setColor("blue")
      setIsMainstream(0); setPriorityWeight(0); setTags(""); setBadgeLabel("")
      setDiscoveredFeeds([])
      setDiscoverError("")
      setShowAdvanced(false)
    }
  }, [editingSource])

  const handleDiscover = async () => {
    if (!inputUrl.trim()) return
    setIsDiscovering(true)
    setDiscoverError("")
    setDiscoveredFeeds([])
    try {
      const res = await myFetch<{ title: string; feeds: { title: string; url: string; type: string }[] }>("/admin/discover", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: inputUrl.trim() }),
      })
      if (res && res.feeds && res.feeds.length > 0) {
        setDiscoveredFeeds(res.feeds)
        if (res.title && !name) {
          setName(res.title)
        }
        if (res.feeds.length === 1) {
          setFeedUrl(res.feeds[0].url)
        }
      } else {
        setDiscoverError("未找到任何訂閱源，請點擊下方進階設定手動輸入訂閱網址。")
      }
    } catch (err: any) {
      setDiscoverError(err.message || "解析連結失敗，請點擊下方進階設定手動輸入網址。")
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (provider === "buzzing" && !subdomain.trim()) return
    if (provider !== "buzzing" && !feedUrl.trim()) return

    const seen = new Set<string>()
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean).filter(t => {
      const key = t.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    onSubmit({
      name: name.trim(),
      provider,
      feed_url: feedUrl.trim(),
      subdomain: subdomain.trim(),
      home_url: homeUrl.trim() || (provider === "buzzing" ? `https://${subdomain.trim()}.buzzing.cc/` : inputUrl.trim()),
      type,
      column_id: columnId,
      color,
      is_mainstream_media: isMainstream,
      priority_weight: priorityWeight,
      tags: JSON.stringify(parsedTags),
      badge_label: badgeLabel.trim(),
    })
    if (!editingSource) {
      setName(""); setProvider("rss"); setFeedUrl(""); setSubdomain(""); setHomeUrl(""); setInputUrl("")
      setType(""); setColumnId("world"); setColor("blue")
      setIsMainstream(0); setPriorityWeight(0); setTags(""); setBadgeLabel("")
      setDiscoveredFeeds([])
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

      <div className="flex flex-col gap-5">
        {/* URL Feed Autodiscovery Section */}
        {!editingSource && (
          <div className="border-b border-white/5 pb-5">
            <label className={labelClass}>URL (網站或 RSS/Atom 訂閱連結)</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="例如 https://example.com 或 https://example.com/feed.xml"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={handleDiscover}
                disabled={isDiscovering || !inputUrl.trim()}
                className={$(
                  "px-4 py-2 rounded-md text-xs font-medium border border-white/10 hover:border-white/25 hover:bg-white/5 whitespace-nowrap transition-all",
                  (isDiscovering || !inputUrl.trim()) && "op-20 cursor-not-allowed"
                )}
              >
                {isDiscovering ? "解析中..." : "解析與發現"}
              </button>
            </div>
            {discoverError && (
              <p className="text-[10px] text-red-400/70 mt-1">{discoverError}</p>
            )}
            
            {/* Discovered feed options */}
            {discoveredFeeds.length > 0 && (
              <div className="mt-3 bg-white/[0.015] border border-white/5 rounded-md p-3">
                <p className="text-[10px] op-40 mb-2 font-sans">請選擇訂閱源網址：</p>
                <div className="flex flex-col gap-1.5 font-sans">
                  {discoveredFeeds.map((f: any) => (
                    <button
                      key={f.url}
                      type="button"
                      onClick={() => {
                        setFeedUrl(f.url)
                        setProvider(f.type === "rsshub" ? "rsshub" : "rss")
                      }}
                      className={$(
                        "text-left text-xs px-2.5 py-2 rounded transition-all duration-200 border flex flex-col gap-0.5",
                        feedUrl === f.url ? "bg-white/5 border-white/20 text-white" : "bg-transparent border-white/5 text-white/50 hover:bg-white/[0.03]"
                      )}
                    >
                      <span className="font-medium text-[11px] flex items-center gap-1.5">
                        {f.title}
                        {f.type === "rsshub" && <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1 rounded">RSSHub</span>}
                      </span>
                      <span className="text-[9px] font-mono op-45 truncate block w-full">{f.url}</span>
                      {f.note && (
                        <span className="text-[9px] text-amber-400/80 leading-normal mt-1 border-t border-white/5 pt-1 mt-1 block">
                          {f.note}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Section 1: 基礎來源 */}
          <div>
            <h3 className="text-xs font-semibold op-50 tracking-wider mb-3">基礎來源</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>名稱</label>
                <input className={inputClass} placeholder="例如 BBC" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>提供商 (Provider)</label>
                <select className={inputClass} value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="rss">RSS (預設)</option>
                  <option value="buzzing">Buzzing</option>
                  <option value="rsshub">RSSHub</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>訂閱連結 (Feed URL)</label>
                <input
                  className={inputClass}
                  placeholder="例如 https://example.com/feed.xml"
                  value={feedUrl}
                  onChange={e => setFeedUrl(e.target.value)}
                  disabled={provider === "buzzing"}
                  required={provider !== "buzzing"}
                />
              </div>
              {provider === "buzzing" ? (
                <div>
                  <label className={labelClass}>Subdomain</label>
                  <div className="flex items-center gap-2">
                    <input className={inputClass} placeholder="bbc" value={subdomain} onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required />
                    <span className="text-[10px] op-20 whitespace-nowrap">.buzzing.cc</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelClass}>官方網站 (Home URL)</label>
                  <input className={inputClass} placeholder="例如 https://example.com/" value={homeUrl} onChange={e => setHomeUrl(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: 內容定義 */}
          <div className="border-t border-white/5 pt-5">
            <h3 className="text-xs font-semibold op-50 tracking-wider mb-3">內容定義</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>內容類型</label>
                <select className={inputClass} value={type} onChange={e => {
                  const val = e.target.value
                  setType(val)
                  // Reset isMainstream if not standard news
                  if (val !== "") {
                    setIsMainstream(0)
                  } else {
                    setIsMainstream(1) // Default to active news tab for news type
                  }
                }}>
                  <option value="">新聞 (時間流)</option>
                  <option value="hottest">最熱 (熱榜)</option>
                  <option value="realtime">實時 (快訊)</option>
                </select>
              </div>
              {type === "" && (
                <div>
                  <label className={labelClass}>分類歸屬</label>
                  <select className={inputClass} value={columnId} onChange={e => setColumnId(e.target.value)}>
                    <option value="world">國際</option>
                    <option value="china">國內</option>
                    <option value="tech">科技</option>
                    <option value="finance">財經</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: 展示位置 / 分發頁面 */}
          <div className="border-t border-white/5 pt-5">
            <h3 className="text-xs font-semibold op-50 tracking-wider mb-3">顯示位置 / 分發頁面</h3>
            <div className="flex gap-3 items-center mt-2 flex-wrap">
              {/* 全部 (Always active) */}
              <span className="text-xs text-white/50 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded">
                <span className="i-ph:check text-green-400" /> 全部
              </span>

              {/* 新聞 */}
              {type === "" ? (
                <label className={$(
                  "text-xs flex items-center gap-1.5 border px-2.5 py-1 rounded cursor-pointer transition-all",
                  isMainstream === 1 ? "bg-white/10 border-white/20 text-white" : "bg-white/[0.01] border-white/5 text-white/40 hover:border-white/15"
                )}>
                  <input
                    type="checkbox"
                    checked={isMainstream === 1}
                    onChange={e => setIsMainstream(e.target.checked ? 1 : 0)}
                    className="accent-white/50 cursor-pointer"
                  />
                  新聞
                </label>
              ) : (
                <span className="text-xs text-white/20 flex items-center gap-1.5 bg-white/[0.01] border border-white/5 px-2.5 py-1 rounded cursor-not-allowed">
                  <span className="i-ph:minus text-white/10" /> 新聞
                </span>
              )}

              {/* 熱榜 */}
              {type === "hottest" ? (
                <span className="text-xs text-white/80 flex items-center gap-1.5 bg-white/10 border border-white/20 px-2.5 py-1 rounded">
                  <span className="i-ph:check text-green-400" /> 熱榜
                </span>
              ) : (
                <span className="text-xs text-white/20 flex items-center gap-1.5 bg-white/[0.01] border border-white/5 px-2.5 py-1 rounded cursor-not-allowed">
                  <span className="i-ph:minus text-white/10" /> 熱榜
                </span>
              )}

              {/* 快訊 */}
              {type === "realtime" ? (
                <span className="text-xs text-white/80 flex items-center gap-1.5 bg-white/10 border border-white/20 px-2.5 py-1 rounded">
                  <span className="i-ph:check text-green-400" /> 快訊
                </span>
              ) : (
                <span className="text-xs text-white/20 flex items-center gap-1.5 bg-white/[0.01] border border-white/5 px-2.5 py-1 rounded cursor-not-allowed">
                  <span className="i-ph:minus text-white/10" /> 快訊
                </span>
              )}
            </div>
            <p className="text-[10px] op-25 mt-2">
              {type === "" 
                ? "勾選「新聞」後，該來源的內容會分發至首頁的「新聞」主分頁，否則僅會出現在「分類歸屬」和「全部」分頁。" 
                : `內容類型為「${type === "hottest" ? "熱榜" : "快訊"}」，系統將自動分發到對應頁面，無需手動配置。`}
            </p>
          </div>
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
              {provider === "buzzing" && (
                <div>
                  <label className={labelClass}>官方網站 (Home URL)</label>
                  <input className={inputClass} placeholder="例如 https://example.com/" value={homeUrl} onChange={e => setHomeUrl(e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelClass}>顏色</label>
                <select className={inputClass} value={color} onChange={e => setColor(e.target.value)}>
                  {["blue", "red", "green", "orange", "gray", "teal", "indigo", "emerald", "slate"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>排序權重</label>
                <input type="number" className={inputClass} value={priorityWeight} onChange={e => setPriorityWeight(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>標籤 (Tags)</label>
                <input className={inputClass} value={tags} placeholder="ai, web3" onChange={e => setTags(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Badge 標籤</label>
                <input className={inputClass} value={badgeLabel} placeholder="—" onChange={e => setBadgeLabel(e.target.value)} />
              </div>
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
          disabled={isLoading || !name.trim() || (provider === "buzzing" && !subdomain.trim()) || (provider !== "buzzing" && !feedUrl.trim())}
          className={$(
            "px-5 py-2 rounded-md text-xs font-medium transition-all duration-300",
            "border border-white/10 hover:border-white/25 hover:bg-white/5",
            (isLoading || !name.trim() || (provider === "buzzing" && !subdomain.trim()) || (provider !== "buzzing" && !feedUrl.trim())) && "op-20 cursor-not-allowed",
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
  const getAvatarUrl = () => {
    if (source.provider === "buzzing") {
      return `https://${source.subdomain}.buzzing.cc/icon.png`
    }
    if (source.home_url) {
      try {
        const url = new URL(source.home_url)
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`
      } catch {
        // ignore
      }
    }
    if (source.feed_url) {
      try {
        const url = new URL(source.feed_url)
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`
      } catch {
        // ignore
      }
    }
    return ""
  }

  const avatarUrl = getAvatarUrl()

  return (
    <div
      className={$(
        "group flex items-center gap-4 px-4 py-3 transition-all duration-300",
        "bg-white/[0.02] hover:bg-white/[0.05]",
        !source.is_active && "op-35",
      )}
    >
      <div
        className="w-8 h-8 rounded-full bg-cover bg-center flex-shrink-0 border border-white/8 flex items-center justify-center bg-white/[0.03]"
        style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
      >
        {!avatarUrl && <span className="i-ph:rss-simple-duotone text-xs op-40" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium op-85 truncate">{source.name}</span>
          <span className="text-[10px] op-25 font-mono">
            {source.provider === "buzzing" ? `${source.subdomain}.buzzing.cc` : (source.provider || "rss")}
          </span>
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
          <span className="text-[10px] op-25 font-mono truncate block max-w-[280px] md:max-w-xs">{source.feed_url || source.id}</span>
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
// Tag badges (dedup)
// ────────────────────────────────────────────────
function SourceTagsBadges({ tags, name, subdomain }: { tags?: string, name: string, subdomain?: string }) {
  let parsed: string[] = []
  try {
    if (tags && tags !== "[]") parsed = JSON.parse(tags)
  } catch { /* ignore */ }
  if (!Array.isArray(parsed)) parsed = []

  const nameLower = name.toLowerCase()
  const subLower = subdomain ? subdomain.toLowerCase() : ""
  const dedupTags = parsed.filter(t => {
    const tl = t.toLowerCase()
    return tl !== nameLower && (subLower ? tl !== subLower : true)
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
