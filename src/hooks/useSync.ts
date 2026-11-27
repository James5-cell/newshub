import { safeStorage } from "@shared/storage"
import type { PrimitiveMetadata } from "@shared/types"
import { useLayoutEffect, useReducer } from "react"
import { useLogin } from "./useLogin"
import { useToast } from "./useToast"
import { syncAccountAtom } from "~/atoms/primitiveMetadataAtom"
import { safeParseString } from "~/utils"

type SyncedMetadata = Pick<PrimitiveMetadata, "data" | "updatedTime" | "manualOrderByColumn">

async function uploadMetadata(metadata: PrimitiveMetadata) {
  const jwt = safeParseString(safeStorage.getItem("jwt"))
  return myFetch<Partial<SyncedMetadata> & { success: boolean }>("/me/sync", {
    method: "POST",
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: {
      data: metadata.data,
      updatedTime: metadata.updatedTime,
      manualOrderByColumn: metadata.manualOrderByColumn ?? {},
    },
  })
}

async function downloadMetadata(): Promise<PrimitiveMetadata | undefined> {
  const jwt = safeParseString(safeStorage.getItem("jwt"))
  const { data, updatedTime, manualOrderByColumn } = await myFetch<SyncedMetadata>("/me/sync", {
    headers: {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  })
  // 不用同步 action 字段
  if (data) {
    return {
      action: "sync",
      manualOrderByColumn,
      data,
      updatedTime,
    }
  }
}

export function useSync() {
  const [primitiveMetadata, setPrimitiveMetadata] = useAtom(primitiveMetadataAtom)
  const { login, accountId } = useLogin()
  const setSyncAccount = useSetAtom(syncAccountAtom)
  useLayoutEffect(() => {
    setSyncAccount(accountId ?? null)
  }, [accountId, setSyncAccount])
  const toaster = useToast()
  const [downloadAttempt, retryDownload] = useReducer(count => count + 1, 0)
  const [uploadAttempt, retryUpload] = useReducer(count => count + 1, 0)

  const lastUploadAttempt = useRef(0)

  const reportFailure = useCallback((error: unknown, retry: () => void) => {
    const status = (error as { statusCode?: number } | null)?.statusCode
    if (status === 506) return
    if (status === 401) {
      toaster("登录已过期，请重新登录以同步关注和排序。", {
        type: "warning", action: { label: "登录", onClick: login },
      })
      return
    }
    toaster("同步暂时失败，当前设置已保留在本机。", {
      type: "warning", action: { label: "重试同步", onClick: retry },
    })
  }, [login, toaster])

  useEffect(() => {
    const owner = primitiveMetadata.pendingSyncFor
    if (!accountId || owner === undefined || (owner !== null && owner !== accountId)) return
    let active = true
    const retrying = uploadAttempt !== lastUploadAttempt.current
    lastUploadAttempt.current = uploadAttempt
    const timer = setTimeout(() => {
      uploadMetadata(primitiveMetadata).then(ack => {
        if (!active || !ack.success) return
        setPrimitiveMetadata(current => {
          if (current.updatedTime !== primitiveMetadata.updatedTime) return current
          if (ack.data && ack.updatedTime !== undefined) {
            return preprocessMetadata({
              data: ack.data, updatedTime: ack.updatedTime, manualOrderByColumn: ack.manualOrderByColumn, action: "sync",
            })
          }
          // Older servers acknowledge the timestamp without returning the snapshot.
          if (ack.updatedTime !== current.updatedTime) return current
          return { ...current, action: "sync", pendingSyncFor: undefined }
        })
      }).catch(error => {
        if (active) reportFailure(error, retryUpload)
      })
    }, retrying || primitiveMetadata.action === "init" ? 0 : 10000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [accountId, primitiveMetadata, reportFailure, setPrimitiveMetadata, uploadAttempt])

  useEffect(() => {
    if (!accountId) return
    let active = true
    downloadMetadata().then(metadata => {
      if (active && metadata) {
        // Only an upload acknowledgement can clear an equal-revision pending edit.
        setPrimitiveMetadata(current => metadata.updatedTime > current.updatedTime ? preprocessMetadata(metadata) : current)
      }
    }).catch(error => {
      if (active) reportFailure(error, retryDownload)
    })
    return () => { active = false }
  }, [accountId, downloadAttempt, reportFailure, setPrimitiveMetadata])
}
