import type { BehaviorEventReporter, ClickMetric } from './shared'
import { getSelector } from '../utils/selector'
import { buildBehaviorBase } from './shared'

export interface ClickObserverOptions {
  throttleMs?: number
  ignoreTags?: string[]
  maxTextLength?: number
}

function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let lastCall = 0
  let timer: number | undefined

  const invoke = (context: any, args: any[]) => {
    lastCall = Date.now()
    fn.apply(context, args)
  }

  return function (this: any, ...args: any[]) {
    const now = Date.now()
    const remaining = wait - (now - lastCall)

    if (remaining <= 0) {
      if (timer) {
        window.clearTimeout(timer)
        timer = undefined
      }
      invoke(this, args)
      return
    }

    if (!timer) {
      timer = window.setTimeout(() => {
        timer = undefined
        invoke(this, args)
      }, remaining)
    }
  } as T
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

  const handler = throttle((event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element))
      return

    const tagName = target.tagName.toUpperCase()
    if (ignoreTags.has(tagName))
      return

    const text = target instanceof HTMLElement ? normalizeText(target.textContent || '', maxTextLength) : ''
    const metric = {
      ...buildBehaviorBase('CLICK'),
      tagName,
      text: text || undefined,
      selector: getSelector(target),
    } as ClickMetric

    report(metric)
  }, throttleMs)

  document.addEventListener('click', handler)

  return () => document.removeEventListener('click', handler)
}
