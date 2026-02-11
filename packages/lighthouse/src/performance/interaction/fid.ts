export interface FidMetric {
  type: 'interaction'
  subType: 'FID'
  pageUrl: string
  value: number
  delay: number
  entry: PerformanceEntry
}

export type FidReporter = (metric: FidMetric) => void

export function observeFID(report: FidReporter): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('first-input'))
    return () => {}

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime
      const delay = (entry as PerformanceEventTiming).startTime - (entry as PerformanceEventTiming).processingStart
      report({
        type: 'interaction',
        subType: 'FID',
        pageUrl: location.href,
        delay,
        value: fid,
        entry,
      })
      obs.disconnect()
    }
  })

  obs.observe({ type: 'first-input', buffered: true })

  return () => obs.disconnect()
}
