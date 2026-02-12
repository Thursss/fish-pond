import type { ErrorReporter, ResourceErrorMetric } from './shared'
import { getResourceUrl, getSelector } from '../utils/get'
import { isElement } from '../utils/is'
import { buildErrorBase } from './shared'

const RESOURCE_TAGS = new Set(['img', 'script', 'link', 'audio', 'video', 'source', 'text/plain'])

export function monitorResourceErrors(report: ErrorReporter): () => void {
  if (typeof window === 'undefined')
    return () => {}

  const handler = (event: Event) => {
    if (!isElement(event, 'ErrorEvent'))
      return

    const target = event.target
    if (!isElement(target, 'HTMLElement'))
      return

    const tagName = (target as HTMLElement).tagName.toLowerCase()
    if (!RESOURCE_TAGS.has(tagName))
      return

    report({
      ...buildErrorBase('resource'),
      tagName,
      resourceUrl: getResourceUrl(target),
      selector: getSelector(target as HTMLElement),
    } as ResourceErrorMetric)
  }

  window.addEventListener('error', handler, true)

  return () => {
    window.removeEventListener('error', handler, true)
  }
}
