import { reportOnHiddenOrInteract } from '../util/on-visibility'

export interface LoadMetric {
  type: 'performance'
  subType: 'LOAD'
  pageUrl: string
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
      type: 'performance',
      subType: 'LOAD',
      pageUrl: location.href,
      startTime: nav.startTime,
      value: nav.loadEventEnd - nav.startTime,
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      domInteractive: nav.domInteractive - nav.startTime,
      entry: nav,
    }
  }

  const timing = performance.timing
  if (!timing || !timing.loadEventEnd)
    return null

  const startTime = timing.navigationStart

  return {
    type: 'performance',
    subType: 'LOAD',
    pageUrl: location.href,
    startTime,
    value: timing.loadEventEnd - startTime,
    ttfb: timing.responseStart - timing.requestStart,
    domContentLoaded: timing.domContentLoadedEventEnd - startTime,
    domInteractive: timing.domInteractive - startTime,
  }
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
