export interface FcpMetric {
  type: 'performance'
  subType: 'FCP'
  name: 'first-contentful-paint'
  pageUrl: string
  startTime: number
  entry: PerformancePaintTiming
}

export type FcpReporter = (metric: FcpMetric) => void

export function observeFCP(report: FcpReporter): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('paint'))
    return () => {}

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        report({
          type: 'performance',
          subType: 'FCP',
          name: 'first-contentful-paint',
          pageUrl: location.href,
          startTime: entry.startTime,
          entry: entry as PerformancePaintTiming,
        })
        obs.disconnect()
        break
      }
    }
  })

  obs.observe({ type: 'paint', buffered: true })

  return () => obs.disconnect()
}
