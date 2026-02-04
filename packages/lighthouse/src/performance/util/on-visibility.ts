type Callback = () => void

export function reportOnHiddenOrInteract(cb: Callback): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return () => {}

  let called = false

  const run = () => {
    if (called)
      return
    called = true
    cb()
    cleanup()
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden')
      run()
  }

  const options = { once: true, capture: true } as AddEventListenerOptions

  const cleanup = () => {
    document.removeEventListener('visibilitychange', onVisibilityChange, true)
    window.removeEventListener('pagehide', run, true)
    window.removeEventListener('keydown', run, true)
    window.removeEventListener('pointerdown', run, true)
    window.removeEventListener('click', run, true)
    window.removeEventListener('scroll', run, true)
  }

  document.addEventListener('visibilitychange', onVisibilityChange, true)
  window.addEventListener('pagehide', run, options)
  window.addEventListener('keydown', run, options)
  window.addEventListener('pointerdown', run, options)
  window.addEventListener('click', run, options)
  window.addEventListener('scroll', run, options)

  return cleanup
}
