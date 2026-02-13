import { getUserAgent } from '../utils/get'

export type PerformanceType = 'interaction' | 'performance' | 'loading' | 'network' | 'visual-stability'
export type PerformanceSubType = 'FID' | 'INP' | 'LongTask' | 'FCP' | 'FP' | 'LCP' | 'LOAD' | 'REQUEST' | 'RESPONSE' | 'CLS'

export interface PerformanceBase {
  type: PerformanceType
  subType: PerformanceSubType
  pageUrl: string
  timestamp: number
  userAgent: string
}
export function buildPerformanceBase(type: PerformanceType, subType: PerformanceSubType): PerformanceBase {
  const pageUrl = typeof location === 'undefined' ? '' : location.href
  return {
    type,
    subType,
    pageUrl,
    timestamp: Date.now(),
    userAgent: getUserAgent(),
  }
}
