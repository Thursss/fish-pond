import type { SenderCustom } from '../utils/report/sender'

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
    userAgent: navigator?.userAgent || 'undefined',
  }
}

export function shouldIgnoreUrl(url: string, ignoreUrls?: Array<string | RegExp>): boolean {
  if (!ignoreUrls || ignoreUrls.length === 0)
    return false

  return ignoreUrls.some((pattern) => {
    if (typeof pattern === 'string')
      return url.includes(pattern)

    pattern.lastIndex = 0
    return pattern.test(url)
  })
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

export function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string')
    return input

  if (input instanceof URL)
    return input.toString()

  if (typeof Request !== 'undefined' && input instanceof Request)
    return input.url

  return String(input)
}

export function getFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method)
    return init.method.toUpperCase()

  if (typeof Request !== 'undefined' && input instanceof Request)
    return input.method.toUpperCase()

  return 'GET'
}

export function getResourceUrl(target: HTMLElement): string | undefined {
  if (target instanceof HTMLImageElement)
    return target.currentSrc || target.src || undefined

  if (target instanceof HTMLScriptElement)
    return target.src || undefined

  if (target instanceof HTMLLinkElement)
    return target.href || undefined

  if (target instanceof HTMLAudioElement || target instanceof HTMLVideoElement)
    return target.currentSrc || target.src || undefined

  if (target instanceof HTMLSourceElement)
    return target.src || undefined

  return undefined
}
