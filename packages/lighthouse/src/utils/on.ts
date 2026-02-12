type Callback = () => void

interface OptionsType {
  eventNames?: string[]
  options?: AddEventListenerOptions | boolean
}

/**
 * 页面可见性变化和用户交互监控工具函数
 * 用于在页面隐藏或用户开始交互时触发回调，适用于LCP、CLS等需要在页面生命周期结束时上报的指标
 *
 * @param cb - 回调函数，当页面隐藏或用户交互时执行
 * @param options - 配置选项，包含监听的事件类型和事件监听器选项
 * @returns 清理函数，调用后可移除所有事件监听器
 */
export function reportOnHiddenOrInteract(cb: Callback, options: OptionsType = { eventNames: ['visibilitychange', 'pagehide', 'keydown', 'pointerdown', 'click', 'scroll'], options: {} }) {
  // 环境兼容性检查：确保在浏览器环境中运行
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return () => {}

  const run = () => {
    cb() // 执行用户传入的回调函数
  }

  /**
   * 处理页面可见性变化的专用函数
   * 只在页面真正隐藏时才触发回调，避免页面切换标签页时的误报
   */
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden')
      run()
  }

  /**
   * 清理函数：移除所有已注册的事件监听器
   * 防止内存泄漏和重复监听
   */
  const cleanup = () => {
    options.eventNames?.forEach((eventName) => {
      if (eventName === 'visibilitychange')
        document.removeEventListener('visibilitychange', onVisibilityChange, options.options)
      else
        window.removeEventListener(eventName, run, options.options)
    })
  }

  // 注册所有指定的事件监听器
  options.eventNames?.forEach((eventName) => {
    if (eventName === 'visibilitychange')
      document.addEventListener('visibilitychange', onVisibilityChange, options.options)
    else
      window.addEventListener(eventName, run, options.options)
  })

  return cleanup
}

export function onUrlChange(cb: () => void) {
  // 1. 监听浏览器前进/后退
  window.addEventListener('popstate', cb)

  // 2. 劫持 pushState (Vue/React 路由跳转常用)
  const originalPush = history.pushState
  history.pushState = function (...args) {
    const result = originalPush.apply(this, args)
    cb()
    return result
  }

  // 3. 劫持 replaceState
  const originalReplace = history.replaceState
  history.replaceState = function (...args) {
    const result = originalReplace.apply(this, args)
    cb()
    return result
  }
}
