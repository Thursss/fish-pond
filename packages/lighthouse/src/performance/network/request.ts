import type { PerformanceBase } from '../shared'
import { shouldIgnoreUrl } from '../../utils/report/sampler'
import { buildPerformanceBase } from '../shared'

export interface RequestMetric extends PerformanceBase {
  type: 'network'
  subType: 'REQUEST'
  name: string
  duration: number
  initiatorType: string
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  nextHopProtocol: string
  responseStatus: number

  serverTime: number
  dnsLookupTime: number
  tcpHandshakeTime: number
  responseTime: number
  fetchTime: number
  ttfb: number

  entry: PerformanceResourceTiming
}

export type RequestReporter = (metric: RequestMetric) => void

export interface RequestObserverOptions {
  duration?: number
  transferSize?: number
  ignoreUrls?: Array<string | RegExp>
}

const REQUEST_INITIATOR_TYPES = new Set(['fetch', 'xmlhttprequest'])

export function observeRequest(report: RequestReporter, options: RequestObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('resource'))
    return () => {}

  const { duration: slowThreshold = 800, transferSize: sizeThreshold = 20 * 1024 } = options

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const resource = entry as PerformanceResourceTiming

      if (resource.responseStatus >= 200 && resource.responseStatus < 400)
        continue

      if (!REQUEST_INITIATOR_TYPES.has(resource.initiatorType))
        continue

      if (shouldIgnoreUrl(resource.name, options.ignoreUrls))
        continue

      const transferSize = resource.transferSize || 0
      if (resource.duration < slowThreshold && transferSize < sizeThreshold)
        continue

      const requestStart = resource.requestStart || resource.startTime
      const responseStart = resource.responseStart || resource.startTime

      const dnsLookupTime = Math.max(0, resource.domainLookupEnd - resource.domainLookupStart)
      const tcpHandshakeTime = Math.max(0, resource.connectEnd - resource.connectStart)
      const ttfb = Math.max(0, responseStart - requestStart)
      const fetchTime = Math.max(0, resource.fetchStart - requestStart)
      const responseTime = Math.max(0, responseStart - requestStart)
      const serverTime = resource.serverTiming.reduce((acc, cur) => acc + cur.duration, 0)

      report({
        ...buildPerformanceBase('network', 'REQUEST'),
        name: resource.name,
        duration: resource.duration,
        initiatorType: resource.initiatorType,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        decodedBodySize: resource.decodedBodySize,
        nextHopProtocol: resource.nextHopProtocol,
        responseStatus: resource.responseStatus,

        serverTime,
        dnsLookupTime,
        tcpHandshakeTime,
        responseTime,
        fetchTime,
        ttfb,

        entry: resource,
      } as RequestMetric)
    }
  })

  obs.observe({ type: 'resource', buffered: true })

  return () => obs.disconnect()
}
