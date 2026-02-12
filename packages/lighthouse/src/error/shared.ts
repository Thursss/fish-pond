import type { SenderCustom } from '../utils/report/sender'
import { getUserAgent } from '../utils/get'

export type ErrorSubType = 'js' | 'promise' | 'resource' | 'network'

export interface ErrorBaseMetric extends SenderCustom {
  type: 'error'
  subType: ErrorSubType
  pageUrl: string
  timestamp: number
  userAgent?: string
}

export interface JsErrorMetric extends ErrorBaseMetric {
  subType: 'js'
  message: string
  source?: string
  lineno?: number
  colno?: number
  name?: string
  stack?: string
}

export interface PromiseErrorMetric extends ErrorBaseMetric {
  subType: 'promise'
  message: string
  reason?: string
  name?: string
  stack?: string
}

export interface ResourceErrorMetric extends ErrorBaseMetric {
  subType: 'resource'
  tagName: string
  resourceUrl?: string
  selector?: string
}

export interface NetworkErrorMetric extends ErrorBaseMetric {
  subType: 'network'
  url: string
  method?: string
  status?: number
  startTime?: number
  statusText?: string
  duration?: number
  initiatorType: 'fetch' | 'xmlhttprequest'
  errorType: 'timeout' | 'error' | 'abort' | 'http'
}

export type ErrorMetric = JsErrorMetric | PromiseErrorMetric | ResourceErrorMetric | NetworkErrorMetric

export type ErrorReporter = (metric: ErrorMetric) => void

export function buildErrorBase(subType: ErrorSubType): ErrorBaseMetric {
  const pageUrl = typeof location === 'undefined' ? '' : location.href
  return {
    type: 'error',
    subType,
    pageUrl,
    timestamp: Date.now(),
    userAgent: getUserAgent(),
  }
}

export function resolveUrl(url: string): string {
  if (typeof location === 'undefined')
    return url

  try {
    return new URL(url, location.href).href
  }
  catch {
    return url
  }
}

export function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function')
    return performance.now()

  return Date.now()
}
