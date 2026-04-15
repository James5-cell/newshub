import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import type { CustomSourceInfo } from "~/hooks/useCustomSources"
import { safeParseString } from "~/utils"

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
        body,
      })
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ["custom-sources"] })
    },
  })

  // 更新（含 toggle active）
  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      return await myFetch("/admin/sources", {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body,
      })
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ["custom-sources"] })
    },
  })

  // 刪除
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await myFetch(`/admin/sources?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ["custom-sources"] })
    },
  })

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
    <div className="max-w-4xl mx-auto px-4">
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

      {/* ── 新增表單 ── */}
      <AddSourceForm
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        error={createMutation.error}
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
                  onDelete={() => {
                    if (confirm(`確定要刪除 "${source.name}" 嗎？`)) {
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
    </div>
  )
}

// ── 新增來源表單 ──
function AddSourceForm({ onSubmit, isLoading, error }: {
  onSubmit: (data: Record<string, any>) => void
  isLoading: boolean
  error: Error | null
}) {
  const [name, setName] = useState("")
  const [subdomain, setSubdomain] = useState("")
  const [type, setType] = useState("")
  const [columnId, setColumnId] = useState("world")
  const [color, setColor] = useState("blue")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !subdomain.trim()) return
    onSubmit({
      name: name.trim(),
      subdomain: subdomain.trim(),
      type,
      column_id: columnId,
      color,
    })
    // 清空表單
    setName("")
    setSubdomain("")
    setType("")
    setColumnId("world")
    setColor("blue")
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 outline-none focus:border-primary/30 transition-colors text-sm"
  const labelClass = "text-xs font-medium op-60 mb-1 block"

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-primary/5 border border-primary/10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <span className="i-ph:plus-circle-duotone" />
        新增 Buzzing 來源
      </h2>

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
        <div>
          <label className={labelClass}>類型</label>
          <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
            <option value="">一般 (Timeline)</option>
            <option value="hottest">最熱 (Hottest)</option>
            <option value="realtime">實時 (Realtime)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>分類</label>
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
function SourceRow({ source, onToggle, onDelete, isUpdating }: {
  source: AdminSource
  onToggle: () => void
  onDelete: () => void
  isUpdating: boolean
}) {
  const columnLabels: Record<string, string> = {
    world: "國際",
    china: "國內",
    tech: "科技",
    finance: "財經",
  }

  const typeLabels: Record<string, string> = {
    hottest: "最熱",
    realtime: "實時",
    "": "一般",
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
        </div>
        <div className="text-xs op-40 mt-1">
          ID: {source.id}
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

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="btn i-ph:trash-duotone text-lg text-red-400 hover:text-red-500 transition-colors"
          title="刪除"
        />
      </div>
    </motion.div>
  )
}
