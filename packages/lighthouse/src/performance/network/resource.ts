export interface ResourceMetric {
  type: 'network'
  subType: 'resource'
  pageUrl: string
  name: string
  startTime: number
  duration: number
  initiatorType: string
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  nextHopProtocol: string
  entry: PerformanceResourceTiming
}

export type ResourceReporter = (metric: ResourceMetric) => void

export interface ResourceObserverOptions {
  slowThreshold?: number
  sizeThreshold?: number
  ignoreUrls?: Array<string | RegExp>
}

const DEFAULT_SLOW_THRESHOLD = 800
const DEFAULT_SIZE_THRESHOLD = 200 * 1024
const REQUEST_INITIATOR_TYPES = new Set(['fetch', 'xmlhttprequest'])

function shouldIgnoreUrl(url: string, ignoreUrls?: Array<string | RegExp>): boolean {
  if (!ignoreUrls || ignoreUrls.length === 0)
    return false

  return ignoreUrls.some((pattern) => {
    if (typeof pattern === 'string')
      return url.includes(pattern)

    pattern.lastIndex = 0
    return pattern.test(url)
  })
}

export function observeResource(report: ResourceReporter, options: ResourceObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('resource'))
    return () => {}

  const slowThreshold = options.slowThreshold ?? DEFAULT_SLOW_THRESHOLD
  const sizeThreshold = options.sizeThreshold ?? DEFAULT_SIZE_THRESHOLD

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const resource = entry as PerformanceResourceTiming
      // 过滤非请求资源
      if (REQUEST_INITIATOR_TYPES.has(resource.initiatorType))
        continue

      if (shouldIgnoreUrl(resource.name, options.ignoreUrls))
        continue

      const transferSize = resource.transferSize || 0
      if (resource.duration < slowThreshold && transferSize < sizeThreshold)
        continue

      report({
        type: 'network',
        subType: 'resource',
        pageUrl: location.href,
        name: resource.name,
        startTime: resource.startTime,
        duration: resource.duration,
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
