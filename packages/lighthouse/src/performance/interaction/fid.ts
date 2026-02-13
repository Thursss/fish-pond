import type { PerformanceBase } from '../shared'
import { buildPerformanceBase } from '../shared'

export interface FidMetric extends PerformanceBase {
  type: 'interaction'
  subType: 'FID'
  handlerTime: number
  inputDelay: number
  interactionId: string
  entry: PerformanceEntry
}

export type FidReporter = (metric: FidMetric) => void

export interface FIDObserverOptions {
  inputDelay?: number
}
export function observeFID(report: FidReporter, options: FIDObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('first-input'))
    return () => {}

  const passLine = options.inputDelay ?? 100

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const target = entry as PerformanceEventTiming
      const inputDelay = target.processingStart - entry.startTime
      const handlerTime = target.processingEnd - target.processingStart
      if (inputDelay < passLine)
        continue

      report({
        ...buildPerformanceBase('interaction', 'FID'),
        inputDelay,
        handlerTime,
        interactionId: (target as any).interactionId,
        entry,
      } as FidMetric)
      obs.disconnect()
    }
  })

  obs.observe({ type: 'first-input', buffered: true })

  return () => obs.disconnect()
}
