import type { SenderBase, SenderOptions } from '../utils/report/sender'
import { createSender } from '../utils/report/sender'
import { monitorJavaScriptErrors } from './errorHandler'
import { monitorNetworkErrors } from './networkMonitor'
import { monitorResourceErrors } from './resourceMonitor'

export interface ErrorMonitorOptions extends SenderOptions, SenderBase {
  ignoreUrls?: Array<string | RegExp>
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
    const report = createSender(this.options, {
      appName: this.options.appName,
      appVersion: this.options.appVersion,
      appId: this.options.appId,
      environment: this.options.environment,
    })

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

export function initErrorMonitor(options: ErrorMonitorOptions): ErrorMonitor {
  const monitor = new ErrorMonitor(options)
  monitor.init()
  return monitor
}
