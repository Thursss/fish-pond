import { getSelector } from '../util/selector'

export interface InpMetric {
  type: 'interaction'
  subType: 'INP'
  pageUrl: string
  value: number
  startTime: number
  name: string
  interactionId: number
  targetSelector: string
  entry: PerformanceEventTiming
}

export type InpReporter = (metric: InpMetric) => void

export function observeINP(report: InpReporter): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('event'))
    return () => {}

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const event = entry as PerformanceEventTiming

      // @ts-ignore
      if (!entry.interactionId)
        return

      report({
        type: 'interaction',
        subType: 'INP',
        pageUrl: location.href,
        value: event.duration,
        startTime: event.startTime,
        name: event.name,
        // @ts-ignore
        interactionId: event.interactionId,
        targetSelector: event.target ? getSelector(event.target) : '',
        entry: event,
      })
    }
  })

  // Collect all interaction events and report each entry.
  // @ts-ignore
  obs.observe({ type: 'event', buffered: true, durationThreshold: 40 })

  return () => {
    obs.disconnect()
  }
}
