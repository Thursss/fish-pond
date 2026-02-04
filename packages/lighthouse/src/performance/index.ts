import { observeFCP } from './loading/fcp.js'
import { observeFP } from './loading/fp.js'

export class PerformanceMonitor {
  private options
  constructor(options = {}) {
    this.options = { ...{
      /** default options */
      log: true,
    }, ...options }
  }

  init() {
    observeFP((metric) => {
      if (this.options?.log)
        console.log('[PerformanceMonitor] FP:', metric)
    })
    observeFCP((metric) => {
      if (this.options?.log)
        console.log('[PerformanceMonitor] FCP:', metric)
    })
  }
}
