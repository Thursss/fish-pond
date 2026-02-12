import type { BehaviorEventReporter, ClickMetric } from './shared'
import { getSelector } from '../utils/get'
import { throttle } from '../utils/index'
import { isElement, isExist } from '../utils/is'
import { buildBehaviorBase } from './shared'

export interface ClickObserverOptions {
  throttleMs?: number
  ignoreTags?: string[]
  datasetKeys?: string
  maxTextLength?: number
}

function normalizeText(text: string, maxLength: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= maxLength)
    return trimmed
  return `${trimmed.slice(0, maxLength)}...`
}

export function observeClick(report: BehaviorEventReporter, options: ClickObserverOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return () => {}

  const ignoreTags = new Set((options.ignoreTags ?? []).map(tag => tag.toUpperCase()))
  const throttleMs = options.throttleMs ?? 100
  const maxTextLength = options.maxTextLength ?? 120
  const datasetKey = options.datasetKeys ?? 'trackClick'

  const handler = throttle((event: MouseEvent) => {
    const path = event.composedPath()

    const target = path.find(
      node => (node as Node)?.nodeType === 1 && isExist((node as HTMLElement)?.dataset[datasetKey]),
    ) as HTMLElement | undefined

    if (!target)
      return

    const tagName = target.tagName.toUpperCase()
    if (ignoreTags.has(tagName))
      return

    const text = isElement(target, 'HTMLElement') ? normalizeText(target.textContent || '', maxTextLength) : ''
    const metric = {
      ...buildBehaviorBase('CLICK'),
      tagName,
      text: text || undefined,
      selector: getSelector(target),
      selectorData: target.dataset[datasetKey],
    } as ClickMetric

    report(metric)
  }, throttleMs)

  document.addEventListener('click', handler)

  return () => document.removeEventListener('click', handler)
}
