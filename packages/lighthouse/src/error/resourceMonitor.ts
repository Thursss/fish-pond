import type { ErrorReporter, ResourceErrorMetric } from './shared'
import { getSelector } from '../utils/selector'
import { buildErrorBase, getResourceUrl } from './shared'

const RESOURCE_TAGS = new Set(['img', 'script', 'link', 'audio', 'video', 'source', 'text/plain'])

export function monitorResourceErrors(report: ErrorReporter): () => void {
  if (typeof window === 'undefined')
    return () => {}

  const handler = (event: Event) => {
    if (event instanceof ErrorEvent)
      return

    const target = event.target
    if (!(target instanceof HTMLElement))
      return

    const tagName = target.tagName.toLowerCase()
    if (!RESOURCE_TAGS.has(tagName))
      return

    report({
      ...buildErrorBase('resource'),
      tagName,
      resourceUrl: getResourceUrl(target),
      selector: getSelector(target),
    } as ResourceErrorMetric)
  }

  window.addEventListener('error', handler, true)

  return () => {
    window.removeEventListener('error', handler, true)
  }
}
