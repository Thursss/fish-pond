import { shouldIgnoreUrl } from '../../utils/report/sampler'

export interface RequestMetric {
  type: 'network'
  subType: 'request'
  pageUrl: string
  name: string
  startTime: number
  duration: number
  ttfb: number
  initiatorType: string
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  nextHopProtocol: string
  entry: PerformanceResourceTiming
}

export type RequestReporter = (metric: RequestMetric) => void

export interface RequestObserverOptions {
  ignoreUrls?: Array<string | RegExp>
}

const REQUEST_INITIATOR_TYPES = new Set(['fetch', 'xmlhttprequest'])

export function observeRequest(report: RequestReporter, options: RequestObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('resource'))
    return () => {}

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const resource = entry as PerformanceResourceTiming
      if (!REQUEST_INITIATOR_TYPES.has(resource.initiatorType))
        continue

      if (shouldIgnoreUrl(resource.name, options.ignoreUrls))
        continue

      const requestStart = resource.requestStart || resource.startTime
      const responseStart = resource.responseStart || resource.startTime
      const ttfb = Math.max(0, responseStart - requestStart)

      report({
        type: 'network',
        subType: 'request',
        pageUrl: location.href,
        name: resource.name,
        startTime: resource.startTime,
        duration: resource.duration,
        ttfb,
        initiatorType: resource.initiatorType,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        decodedBodySize: resource.decodedBodySize,
        nextHopProtocol: resource.nextHopProtocol,
        entry: resource,
      })
    }
  })

  obs.observe({ type: 'resource', buffered: true })

  return () => obs.disconnect()
}
