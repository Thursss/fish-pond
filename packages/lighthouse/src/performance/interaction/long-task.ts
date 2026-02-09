export interface LongTaskAttribution {
  name: string
  containerType?: string
  containerSrc?: string
  containerId?: string
  containerName?: string
}

export interface LongTaskMetric {
  type: 'longtask'
  pageUrl: string
  startTime: number
  duration: number
  attribution?: LongTaskAttribution[]
  entry: PerformanceEntry
}

export type LongTaskReporter = (metric: LongTaskMetric) => void

export function observeLongTask(report: LongTaskReporter): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('longtask'))
    return () => {}

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration <= 50)
        continue

      const attribution = (entry as any).attribution as Array<any> | undefined

      report({
        type: 'longtask',
        pageUrl: location.href,
        startTime: entry.startTime,
        duration: entry.duration,
        attribution: attribution?.map(item => ({
          name: item.name,
          containerType: item.containerType,
          containerSrc: item.containerSrc,
          containerId: item.containerId,
          containerName: item.containerName,
        })),
        entry,
      })
    }
  })

  obs.observe({ type: 'longtask', buffered: true })

  return () => obs.disconnect()
}
