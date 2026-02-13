import type { PerformanceBase } from '../shared'
import { getSelector } from '../../utils/get'
import { buildPerformanceBase } from '../shared'

export interface InpMetric extends PerformanceBase {
  type: 'interaction'
  subType: 'INP'
  eventType: string
  eventDelay: number
  handlerDuration: number
  duration: number
  targetSelector: string
  interactionId: string
  entry: PerformanceEventTiming
}

export type InpReporter = (metric: InpMetric) => void

export interface INPObserverOptions {
  eventDelay?: number
  handlerDuration?: number
}

export function observeINP(report: InpReporter, options: INPObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('event'))
    return () => {}

  const { eventDelay: minEventDelay = 50, handlerDuration: minHandlerDuration = 20 } = options
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const event = entry as PerformanceEventTiming

      // @ts-ignore
      if (!entry.interactionId)
        return

      const eventDelay = event.processingStart - event.startTime
      const handlerDuration = event.processingEnd - event.processingStart
      if (eventDelay < minEventDelay && handlerDuration < minHandlerDuration)
        continue

      report({
        ...buildPerformanceBase('interaction', 'INP'),
        eventType: event.name,
        eventDelay,
        handlerDuration,
        duration: event.duration,
        targetSelector: event.target ? getSelector(event.target as Element) : '',
        // @ts-ignore
        interactionId: event.interactionId,
        entry: event,
      } as InpMetric)
    }
  })

  // Collect all interaction events and report each entry.
  // @ts-ignore
  obs.observe({ type: 'event', buffered: true, durationThreshold: 40 })

  return () => {
    obs.disconnect()
  }
}
