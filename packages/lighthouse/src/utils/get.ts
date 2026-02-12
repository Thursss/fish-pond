import { isElement } from './is'

export function getUserAgent() {
  return navigator.userAgent
}

export function getSelector(el: Element): string {
  if (!isElement(el, 'Element'))
    return ''

  if ((el as HTMLElement).id)
    return `#${(el as HTMLElement).id}`

  const parts: string[] = []
  let node: Element | null = el

  while (node && node.nodeType === 1) {
    const tag = node.tagName.toLowerCase()
    let part = tag

    const className = (node as HTMLElement).className
    if (className && typeof className === 'string') {
      const classes = className.trim().split(/\s+/).filter(Boolean)
      if (classes.length)
        part += `.${classes[0]}`
    }

    const parent: HTMLElement | null = node.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(s => s.tagName === node!.tagName)
      if (siblings.length > 1) {
        const index = siblings.indexOf(node) + 1
        part += `:nth-of-type(${index})`
      }
    }

    parts.unshift(part)
    if (parts.length >= 4)
      break

    node = parent
  }

  return parts.join(' > ')
}

export function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string')
    return input

  if (isElement(input, 'URL'))
    return input.toString()

  if (typeof Request !== 'undefined' && isElement(input, 'Request'))
    return (input as Request).url

  return String(input)
}

export function getFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method)
    return init.method.toUpperCase()

  if (typeof Request !== 'undefined' && isElement(input, 'Request'))
    return (input as Request).method.toUpperCase()

  return 'GET'
}

export function getResourceUrl(target: any): string | undefined {
  if (isElement(target, 'HTMLImageElement'))
    return target.currentSrc || target.src || undefined

  if (isElement(target, 'HTMLScriptElement'))
    return target.src || undefined

  if (isElement(target, 'HTMLLinkElement'))
    return target.href || undefined

  if (isElement(target, 'HTMLAudioElement') || isElement(target, 'HTMLVideoElement'))
    return target.currentSrc || target.src || undefined

  if (isElement(target, 'HTMLSourceElement'))
    return target.src || undefined

  return undefined
}
