export function getSelector(el: Element | Node): string {
  if (!(el instanceof Element))
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
