import type { SenderCustom, SenderOptions } from '../utils/report/sender'
import type { ClickObserverOptions } from './click'
import type { ExposureObserverOptions } from './exposure'
import type { PageViewObserverOptions } from './pageview'
import type { BehaviorBatchMetric, BehaviorEventReporter, BehaviorMetric } from './shared'
import { shouldSample } from '../utils/report/sampler'
import { createSender } from '../utils/report/sender'
import { Queue } from './../utils/report/queue'
import { observeClick } from './click'
import { observeExposure } from './exposure'
import { observePageView } from './pageview'
import { buildBehaviorBase } from './shared'

export interface BehaviorMonitorOptions extends SenderOptions {
  sampleRate?: number
  maxBatchSize?: number
  flushInterval?: number
  pv?: PageViewObserverOptions | false
  click?: ClickObserverOptions | false
  exposure?: ExposureObserverOptions | false
  custom?: SenderCustom
}

export class BehaviorMonitor {
  private options: BehaviorMonitorOptions
  private cleanups: Array<() => void> = []
  private queue?: Queue<BehaviorMetric>
  private reportEvent?: BehaviorEventReporter

  constructor(options: BehaviorMonitorOptions) {
    this.options = {
      log: true,
      sampleRate: 1,
      maxBatchSize: 20,
      flushInterval: 10000,
      ...options,
    }
  }

  init() {
    const report = createSender(this.options, this.options.custom)

    const queue = new Queue({
      maxBatchSize: this.options.maxBatchSize ?? 20,
      flushInterval: this.options.flushInterval ?? 10000,
      onFlush: (events: BehaviorMetric[]) => {
        const batch: BehaviorBatchMetric = {
          type: 'behavior',
          subType: 'BATCH',
          timestamp: Date.now(),
          events,
        }
        report(batch)
      },
    })

    queue.start()
    this.queue = queue

    const reportEvent: BehaviorEventReporter = (metric) => {
      if (!shouldSample(this.options.sampleRate ?? 1))
        return
      queue.push(metric)
    }

    this.reportEvent = reportEvent

    if (this.options.pv !== false)
      this.cleanups.push(observePageView(reportEvent, this.options.pv ?? {}))

    if (this.options.click !== false)
      this.cleanups.push(observeClick(reportEvent, this.options.click ?? {}))

    if (this.options.exposure !== false)
      this.cleanups.push(observeExposure(reportEvent, this.options.exposure ?? {}))

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const flushOnHide = () => {
        if (document.visibilityState === 'hidden')
          queue.flush()
      }

      const flushOnPageHide = () => queue.flush()

      document.addEventListener('visibilitychange', flushOnHide)
      window.addEventListener('pagehide', flushOnPageHide)

      this.cleanups.push(() => {
        document.removeEventListener('visibilitychange', flushOnHide)
        window.removeEventListener('pagehide', flushOnPageHide)
      })
    }
  }

  trackCustom(name: string, data?: Record<string, unknown>) {
    if (!this.reportEvent)
      return

    this.reportEvent({
      ...buildBehaviorBase('CUSTOM'),
      name,
      data,
    } as BehaviorMetric)
  }

  track(metric: BehaviorMetric) {
    if (!this.reportEvent)
      return

    this.reportEvent(metric)
  }

  flush() {
    this.queue?.flush()
  }

  destroy() {
    for (const cleanup of this.cleanups)
      cleanup()

    this.cleanups = []
    this.queue?.destroy()
    this.queue = undefined
    this.reportEvent = undefined
  }
}

export default function initBehaviorMonitor(options: BehaviorMonitorOptions): BehaviorMonitor {
  const monitor = new BehaviorMonitor(options)
  monitor.init()
  return monitor
}
