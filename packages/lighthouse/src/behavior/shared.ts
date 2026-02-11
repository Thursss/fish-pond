import type { SenderCustom } from '../utils/report/sender'

export type BehaviorSubType = 'PV' | 'CLICK' | 'EXPOSURE' | 'CUSTOM' | 'SDK_HEALTH'

export interface BehaviorBaseMetric extends SenderCustom {
  type: 'behavior'
  subType: BehaviorSubType
  pageUrl: string
  timestamp: number
  userAgent?: string
}

export interface PageViewMetric extends BehaviorBaseMetric {
  subType: 'PV'
  referrer?: string
  title?: string
}

export interface ClickMetric extends BehaviorBaseMetric {
  subType: 'CLICK'
  tagName: string
  text?: string
  selector?: string
}

export interface ExposureMetric extends BehaviorBaseMetric {
  subType: 'EXPOSURE'
  tagName: string
  selector?: string
  ratio?: number
}

export interface CustomMetric extends BehaviorBaseMetric {
  subType: 'CUSTOM'
  name: string
  data?: Record<string, unknown>
}

export interface HealthMetric extends BehaviorBaseMetric {
  subType: 'SDK_HEALTH'
  metrics: Record<string, number>
}

export type BehaviorMetric = PageViewMetric | ClickMetric | ExposureMetric | CustomMetric | HealthMetric

export interface BehaviorBatchMetric extends SenderCustom {
  type: 'behavior'
  subType: 'BATCH'
  timestamp: number
  events: BehaviorMetric[]
}

export type BehaviorEventReporter = (metric: BehaviorMetric) => void

export function buildBehaviorBase(subType: BehaviorSubType): BehaviorBaseMetric {
  const pageUrl = typeof location === 'undefined' ? '' : location.href
  return {
    type: 'behavior',
    subType,
    pageUrl,
    timestamp: Date.now(),
    userAgent: navigator?.userAgent || 'undefined',
  }
}
