import type { PerformanceBase } from '../shared'
import { getSelector } from '../../utils/get'
import { onUrlChange, reportOnHiddenOrInteract } from '../../utils/on'
import { buildPerformanceBase } from '../shared'

export interface ClsMetric extends PerformanceBase {
  type: 'performance'
  subType: 'CLS'
  cls: number
  clsEntries: any[]
}

export type ClsReporter = (metric: ClsMetric) => void
export interface ClsObserverOptions {
  cls?: number
}

export function observeCLS(report: ClsReporter, options: ClsObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  if (!PerformanceObserver.supportedEntryTypes?.includes('layout-shift'))
    return () => {}

  let clsValue = 0
  let clsEntries: any[] = []

  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as any
      if (shift.hadRecentInput)
        continue

      clsValue += shift.value || 0

      if (shift.sources) {
        shift.sources.forEach((source: any) => {
          if (source.node) {
            const clsEntry = {
              selector: getSelector(source.node),
              value: shift.value,
            }
            clsEntries.push(clsEntry)
          }
        })
      }
    }
  })
  obs.observe({ type: 'layout-shift', buffered: true })

  const reportFun = () => {
    if (clsValue < (options.cls ?? 0.1))
      return

    report({
      ...buildPerformanceBase('performance', 'CLS'),
      cls: clsValue,
      clsEntries: [...clsEntries],
    } as ClsMetric)
    clsValue = 0
    clsEntries = []
    obs.disconnect()
  }

  const cleanupVisibility = reportOnHiddenOrInteract(reportFun, { eventNames: ['visibilitychange', 'pagehide'] })
  onUrlChange(() => requestAnimationFrame(reportFun))

  return () => {
    cleanupVisibility()
    obs.disconnect()
  }
}
