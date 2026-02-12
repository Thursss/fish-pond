export function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
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

export function observeHistory(cb: () => void): () => void {
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
