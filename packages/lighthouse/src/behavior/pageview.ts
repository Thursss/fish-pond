import type { BehaviorEventReporter, PageViewMetric } from './shared'
import { buildBehaviorBase } from './shared'

export interface PageViewObserverOptions {
  reportOnLoad?: boolean
  trackHistory?: boolean
  trackHash?: boolean
}

function observeHistory(cb: () => void): () => void {
  if (typeof window === 'undefined')
    return () => {}

  const onPopState = () => cb()
  const originalPush = history.pushState
  const originalReplace = history.replaceState

  history.pushState = function (...args) {
    const result = originalPush.apply(this, args as any)
    cb()
    return result
  }

  history.replaceState = function (...args) {
    const result = originalReplace.apply(this, args as any)
    cb()
    return result
  }

  window.addEventListener('popstate', onPopState)

  return () => {
    history.pushState = originalPush
    history.replaceState = originalReplace
    window.removeEventListener('popstate', onPopState)
  }
}

export function observePageView(report: BehaviorEventReporter, options: PageViewObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return () => {}

  const reportView = () => {
    const metric = {
      ...buildBehaviorBase('PV'),
      referrer: document.referrer || undefined,
      title: document.title || undefined,
    } as PageViewMetric
    report(metric)
  }

  const cleanups: Array<() => void> = []

  if (options.reportOnLoad !== false) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      reportView()
    }
    else {
      const onLoad = () => reportView()
      window.addEventListener('load', onLoad, { once: true })
      cleanups.push(() => window.removeEventListener('load', onLoad))
    }
  }

  if (options.trackHistory !== false)
    cleanups.push(observeHistory(reportView))

  if (options.trackHash !== false) {
    const onHashChange = () => reportView()
    window.addEventListener('hashchange', onHashChange)
    cleanups.push(() => window.removeEventListener('hashchange', onHashChange))
  }

  return () => {
    cleanups.forEach(cleanup => cleanup())
  }
}
