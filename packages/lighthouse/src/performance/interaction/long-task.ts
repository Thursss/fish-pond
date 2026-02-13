import type { PerformanceBase } from '../shared'
import { buildPerformanceBase } from '../shared'

export interface LongTaskAttribution {
  name: string
  containerType?: string
  containerSrc?: string
  containerId?: string
  containerName?: string
}

export interface LongTaskMetric extends PerformanceBase {
  type: 'interaction'
  subType: 'LongTask'
  duration: number
  startTime: number
  name: string
  attribution?: LongTaskAttribution[]
  entry: PerformanceEntry
}

export type LongTaskReporter = (metric: LongTaskMetric) => void
export interface LongTaskObserverOptions {
  duration?: number
}

export function observeLongTask(report: LongTaskReporter, options: LongTaskObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('longtask'))
    return () => {}

  const passLine = options.duration ?? 50
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration <= passLine)
        continue

      const attribution = (entry as any).attribution as Array<any> | undefined

      report({
        ...buildPerformanceBase('interaction', 'LongTask'),
        startTime: entry.startTime,
        duration: entry.duration,
        name: entry.name,
        attribution: attribution?.map(item => ({
          name: item.name,
          containerType: item.containerType,
          containerSrc: item.containerSrc,
          containerId: item.containerId,
          containerName: item.containerName,
        })),
        entry,
      } as LongTaskMetric)
    }
  })

  obs.observe({ type: 'longtask', buffered: true })

  return () => obs.disconnect()
}
