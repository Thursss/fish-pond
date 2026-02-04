import { observeFCP } from './loading/fcp.js'
import { observeFP } from './loading/fp.js'
import { observeLCP } from './loading/lcp.js'
import { observeLoad } from './loading/load.js'
import { createSender } from './report/sender.js'

export class PerformanceMonitor {
  private options
  constructor(options = {}) {
    this.options = { ...{
      /** default options */
      log: true,
    }, ...options }
  }

  init() {
    const report = createSender(this.options)

    observeFP(report)
    observeFCP(report)
    observeLCP(report)
    observeLoad(report)
  }
}
