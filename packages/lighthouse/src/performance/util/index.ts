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
