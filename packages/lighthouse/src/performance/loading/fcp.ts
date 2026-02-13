import type { PerformanceBase } from '../shared'
import { buildPerformanceBase } from '../shared'

export interface FcpMetric extends PerformanceBase {
  type: 'performance'
  subType: 'FCP'
  name: 'first-contentful-paint'
  startTime: number
  entry: PerformancePaintTiming
}

export type FcpReporter = (metric: FcpMetric) => void
export interface FcpObserverOptions {
  startTime?: number
}

export function observeFCP(report: FcpReporter, options?: FcpObserverOptions): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('paint'))
    return () => {}

  const passLine = options?.startTime ?? 1800
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        if (entry.startTime < passLine)
          continue

        report({
          ...buildPerformanceBase('performance', 'FCP'),
          name: 'first-contentful-paint',
          startTime: entry.startTime,
          entry: entry as PerformancePaintTiming,
        } as FcpMetric)
        obs.disconnect()
        break
      }
    }
  })

  obs.observe({ type: 'paint', buffered: true })

  return () => obs.disconnect()
}
