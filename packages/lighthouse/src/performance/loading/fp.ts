import type { PerformanceBase } from '../shared'
import { buildPerformanceBase } from '../shared'

export interface FpMetric extends PerformanceBase {
  type: 'performance'
  subType: 'FP'
  name: 'first-paint'
  startTime: number
  entry: PerformancePaintTiming
}

export type FpReporter = (metric: FpMetric) => void
export interface FpObserverOptions {
  startTime?: number
}

export function observeFP(report: FpReporter, options?: FpObserverOptions): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('paint'))
    return () => {}

  const passLine = options?.startTime ?? 1800
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-paint') {
        if (entry.startTime < passLine)
          continue

        report({
          ...buildPerformanceBase('performance', 'FP'),
          name: 'first-paint',
          startTime: entry.startTime,
          entry: entry as PerformancePaintTiming,
        } as FpMetric)
        obs.disconnect()
        break
      }
    }
  })

  obs.observe({ type: 'paint', buffered: true })

  return () => obs.disconnect()
}
