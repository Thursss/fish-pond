import type { SenderCustom, SenderOptions } from '../utils/report/sender'
import { createSender } from '../utils/report/sender'
import { monitorJavaScriptErrors } from './errorHandler'
import { monitorNetworkErrors } from './networkMonitor'
import { monitorResourceErrors } from './resourceMonitor'

export interface ErrorMonitorOptions extends SenderOptions {
  ignoreUrls?: Array<string | RegExp>
  custom?: SenderCustom
}

export class ErrorMonitor {
  private options: ErrorMonitorOptions
  private cleanups: Array<() => void> = []

  constructor(options: ErrorMonitorOptions) {
    this.options = {
      log: true,
      ...options,
    }
  }

  init() {
    const report = createSender(this.options, this.options.custom)

    const baseIgnoreUrls: Array<string | RegExp> = []
    if (this.options.ignoreUrls)
      baseIgnoreUrls.push(...this.options.ignoreUrls)

    if (this.options.reportUrl)
      baseIgnoreUrls.push(this.options.reportUrl)

    this.cleanups.push(
      monitorJavaScriptErrors(report),
      monitorNetworkErrors(report, {
        ignoreUrls: baseIgnoreUrls,
      }),
      monitorResourceErrors(report),
    )
  }

  destroy() {
    for (const cleanup of this.cleanups)
      cleanup()

    this.cleanups = []
  }
}

export default function initErrorMonitor(options: ErrorMonitorOptions): ErrorMonitor {
  const monitor = new ErrorMonitor(options)
  monitor.init()
  return monitor
}
