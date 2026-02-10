import { onUrlChange } from '../../utils/index.js'
import { reportOnHiddenOrInteract } from '../../utils/on-visibility.js'
import { getSelector } from '../../utils/selector.js'

export interface ClsMetric {
  type: 'performance'
  subType: 'CLS'
  pageUrl: string
  value: number
  clsEntries: any[]
}

export type ClsReporter = (metric: ClsMetric) => void

export function observeCLS(report: ClsReporter): () => void {
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
              // 可以添加更多 debug 信息，如 previousRect, currentRect
            }
            clsEntries.push(clsEntry)
          }
        })
      }
    }
  })
  obs.observe({ type: 'layout-shift', buffered: true })

  const reportFun = () => {
    report({
      type: 'performance',
      subType: 'CLS',
      pageUrl: location.href,
      value: clsValue,
      clsEntries: [...clsEntries],
    })
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
