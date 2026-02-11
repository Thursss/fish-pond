import type { BehaviorEventReporter, ExposureMetric } from './shared'
import { getSelector } from '../utils/selector'
import { buildBehaviorBase } from './shared'

export interface ExposureObserverOptions {
  selector?: string
  once?: boolean
  threshold?: number | number[]
  rootMargin?: string
}

export function observeExposure(report: BehaviorEventReporter, options: ExposureObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return () => {}

  if (typeof IntersectionObserver === 'undefined')
    return () => {}

  const selector = options.selector ?? '[data-expose]'
  const targets = Array.from(document.querySelectorAll(selector))
  if (targets.length === 0)
    return () => {}

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting)
        return

      const target = entry.target
      const metric = {
        ...buildBehaviorBase('EXPOSURE'),
        tagName: target.tagName.toUpperCase(),
        selector: getSelector(target),
        ratio: entry.intersectionRatio,
      } as ExposureMetric

      report(metric)

      if (options.once !== false)
        observer.unobserve(target)
    })
  }, {
    threshold: options.threshold ?? 0.2,
    rootMargin: options.rootMargin,
  })

  targets.forEach(target => observer.observe(target))

  return () => observer.disconnect()
}
