import { getters } from "#/getters"
import { getCacheTable } from "#/database/cache"
import { getCustomSourceTable, getOverrideTable } from "#/database/source-config"
import { getSourceStatusTable } from "#/database/status"
import { createBuzzingGetter } from "#/sources/buzzing"
import { sources } from "@shared/sources"

export async function refreshSource(id: string) {
  const cacheTable = await getCacheTable()
  const statusTable = await getSourceStatusTable()
  const now = Date.now()

  // Get current status to preserve last_success_at
  const currentStatus = statusTable ? await statusTable.get(id) : undefined
  const lastSuccessAt = currentStatus?.last_success_at ?? 0

  try {
    let newData: any[] = []
    
    // Check if it is a static source or a custom source
    if (getters[id as any]) {
      newData = (await getters[id as any]()).slice(0, 30)
    } else {
      const customTable = await getCustomSourceTable()
      const customSource = customTable ? await customTable.getById(id) : undefined
      if (customSource && customSource.is_active) {
        const getter = createBuzzingGetter(customSource.subdomain)
        newData = (await getter()).slice(0, 30)
      } else {
        throw new Error(`Source ${id} not found or inactive`)
      }
    }

    if (cacheTable && newData.length) {
      await cacheTable.set(id, newData)
    } else if (newData.length === 0) {
      throw new Error(`Scraped data is empty for source ${id}`)
    }

    if (statusTable) {
      await statusTable.set({
        id,
        last_attempt_at: now,
        last_success_at: now,
        status: 'success',
        error_message: ""
      })
    }

    return {
      status: "success",
      items: newData,
      updatedTime: now
    }
  } catch (e: any) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    logger.error(`Failed to refresh source ${id}:`, e)
    
    if (statusTable) {
      await statusTable.set({
        id,
        last_attempt_at: now,
        last_success_at: lastSuccessAt,
        status: 'failed',
        error_message: errorMsg
      })
    }
    
    throw e
  }
}

export async function refreshAllSources() {
  // Get all active sources: static and custom
  const overrideTable = await getOverrideTable()
  const hiddenIds = overrideTable ? await overrideTable.getHidden() : []
  const staticIds = Object.keys(sources).filter(id => !hiddenIds.includes(id)) as string[]

  const customTable = await getCustomSourceTable()
  const customSources = customTable ? await customTable.getActive() : []
  const customIds = customSources.map(cs => cs.id)

  const allIds = Array.from(new Set([...staticIds, ...customIds]))

  // We want to run them with a concurrency limit of 5.
  const limit = 5
  const results: { id: string; success: boolean; error?: any }[] = []
  
  const queue = [...allIds]
  
  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift()
      if (!id) break
      
      try {
        await refreshSource(id)
        results.push({ id, success: true })
      } catch (e) {
        results.push({ id, success: false, error: e })
      }
    }
  }

  // Start workers
  const workers = Array.from({ length: Math.min(limit, queue.length) }, () => worker())
  await Promise.all(workers)
  
  return results
}
