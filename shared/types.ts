import type { colors } from "unocss/preset-mini"
import type { columns, fixedColumnIds } from "./metadata"
import type { originSources } from "./pre-sources"

export type Color = "primary" | Exclude<keyof typeof colors, "current" | "inherit" | "transparent" | "black" | "white">

type ConstSources = typeof originSources
type MainSourceID = keyof(ConstSources)

export type SourceID = {
  [Key in MainSourceID]: ConstSources[Key] extends { disable?: true } ? never :
    ConstSources[Key] extends { sub?: infer SubSource } ? {
    // @ts-expect-error >_<
      [SubKey in keyof SubSource]: SubSource[SubKey] extends { disable?: true } ? never : `${Key}-${SubKey}`
    }[keyof SubSource] | Key : Key;
}[MainSourceID]

export type AllSourceID = {
  [Key in MainSourceID]: ConstSources[Key] extends { sub?: infer SubSource } ? keyof {
    // @ts-expect-error >_<
    [SubKey in keyof SubSource as `${Key}-${SubKey}`]: never
  } | Key : Key
}[MainSourceID]

// export type DisabledSourceID = Exclude<SourceID, MainSourceID>

export type ColumnID = keyof typeof columns
export type Metadata = Record<ColumnID, Column>

export interface PrimitiveMetadata {
  updatedTime: number
  data: Record<FixedColumnID, SourceID[]>
  action: "init" | "manual" | "sync"
  /**
   * 各固定分頁是否曾手動拖曳排序（不含 focus）。
   * 未設或 false：跟站方 GET /source-categories 排序；true：保留本機順序。
   */
  manualOrderByColumn?: Partial<Record<FixedColumnID, boolean>>
}

export type FixedColumnID = (typeof fixedColumnIds)[number]
export type HiddenColumnID = Exclude<ColumnID, FixedColumnID>

export interface OriginSource extends Partial<Omit<Source, "name" | "redirect">> {
  name: string
  sub?: Record<string, {
    /**
     * Subtitle 小标题
     */
    title: string
    // type?: "hottest" | "realtime"
    // desc?: string
    // column?: ManualColumnID
    // color?: Color
    // home?: string
    // disable?: boolean
    // interval?: number
  } & Partial<Omit<Source, "title" | "name" | "redirect">>>
}

export interface Source {
  name: string
  /**
   * 刷新的间隔时间
   */
  interval: number
  color: Color

  /**
   * Subtitle 小标题
   */
  title?: string
  desc?: string
  /**
   * Default normal timeline
   */
  type?: "hottest" | "realtime"
  column?: HiddenColumnID
  home?: string
  /**
   * @default false
   */
  disable?: boolean | "cf"
  redirect?: SourceID
}

export interface Column {
  name: string
  sources: SourceID[]
}

export interface NewsItem {
  id: string | number // unique
  title: string
  url: string
  mobileUrl?: string
  pubDate?: number | string
  extra?: {
    hover?: string
    date?: number | string
    info?: false | string
    diff?: number
    icon?: false | string | {
      url: string
      scale: number
    }
  }
}

export interface SourceResponse {
  /**
   * - "success"  : Fresh data just scraped from the source.
   * - "cache"    : Serving valid (non-expired) cached data.
   * - "stale"    : Serving expired cache during an update or after a failed scrape.
   *                Frontend can use this to show a "data may be outdated" hint.
   */
  status: "success" | "cache" | "stale"
  id: SourceID
  updatedTime: number | string
  items: NewsItem[]
  nextRefreshAt?: number
}

export interface RefreshResponse {
  status: "success"
  data: SourceResponse[]
  summary: { checked: number, refreshed: number, cached: number, failed: number, deferred: number }
  errors: { id: string, message: string }[]
  rateLimit: { count: number, limit: number, resetAt: number }
}
