import type { PerformanceBase } from '../shared'
import { reportOnHiddenOrInteract } from '../../utils/on'
import { buildPerformanceBase } from '../shared'

export interface LoadMetric extends PerformanceBase {
  type: 'performance'
  subType: 'LOAD'
  startTime: number
  value: number
  ttfb: number
  domContentLoaded: number
  domInteractive: number
  entry?: PerformanceNavigationTiming
}

export type LoadReporter = (metric: LoadMetric) => void

function getNavigationEntry(): PerformanceNavigationTiming | null {
  if (typeof performance === 'undefined')
    return null

  const entries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[] | undefined
  if (entries && entries.length)
    return entries[0]

  return null
}

function getLoadMetric(): LoadMetric | null {
  if (typeof window === 'undefined' || typeof performance === 'undefined')
    return null

  const nav = getNavigationEntry()
  if (nav) {
    if (!nav.loadEventEnd)
      return null

    return {
      ...buildPerformanceBase('performance', 'LOAD'),
      startTime: nav.startTime,
      value: nav.loadEventEnd - nav.startTime,
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      domInteractive: nav.domInteractive - nav.startTime,
      entry: nav,
    } as LoadMetric
  }

  const timing = performance.timing
  if (!timing || !timing.loadEventEnd)
    return null

  const startTime = timing.navigationStart

  return {
    ...buildPerformanceBase('performance', 'LOAD'),
    startTime,
    value: timing.loadEventEnd - startTime,
    ttfb: timing.responseStart - timing.requestStart,
    domContentLoaded: timing.domContentLoadedEventEnd - startTime,
    domInteractive: timing.domInteractive - startTime,
  } as LoadMetric
}

export function observeLoad(report: LoadReporter): () => void {
  if (typeof window === 'undefined')
    return () => {}

  const reportIfReady = () => {
    const metric = getLoadMetric()
    if (metric)
      report(metric)
  }

  if (document.readyState === 'complete') {
    reportIfReady()
    return () => {}
  }

  const cleanupVisibility = reportOnHiddenOrInteract(reportIfReady, { eventNames: ['pageshow'], options: true })

  return () => cleanupVisibility()
}
