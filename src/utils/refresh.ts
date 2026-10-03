import type { QueryClient } from "@tanstack/react-query"
import type { SourceID, SourceResponse } from "@shared/types"
import { sources } from "@shared/sources"
import { cacheSources } from "./data"

export function applySourceResponses(queryClient: QueryClient, responses: SourceResponse[]) {
  for (const response of responses) {
    const aliases = Object.entries(sources).filter(([, source]) => source.redirect === response.id).map(([id]) => id as SourceID)
    for (const id of [response.id, ...aliases]) {
      const previous = cacheSources.get(id)
      // An earlier cache request can complete after a refresh. Never roll it back.
      if (previous && Number(previous.updatedTime) > Number(response.updatedTime)) continue
      if (previous && Number(previous.updatedTime) === Number(response.updatedTime)
        && previous.status === "success" && response.status === "cache") {
        continue
      }
      cacheSources.set(id, response)
      queryClient.setQueryData(["source", id], response)
    }
  }
}

export function getMountedSources(queryClient: QueryClient, ids?: SourceID[]): SourceID[] {
  const selected = ids && new Set<string>(ids)
  return queryClient.getQueryCache().findAll({ queryKey: ["source"], type: "active" }).map(query => query.queryKey[1] as SourceID).filter(id => !selected || selected.has(id))
}
