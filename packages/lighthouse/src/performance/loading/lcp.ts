import { reportOnHiddenOrInteract } from '../../utils/on-visibility'
import { getSelector } from '../../utils/selector'

export interface LcpMetric {
  type: 'performance'
  subType: 'LCP'
  pageUrl: string
  startTime: number
  size: number
  elementSelector: string
  entry: PerformanceEntry
}

export type LcpReporter = (metric: LcpMetric) => void

/**
 * 监控最大内容绘制（Largest Contentful Paint）指标
 * LCP 表示视口内可见的最大图片或文本块渲染完成的时刻，是Google最看重的加载指标
 *
 * @param report - 上报函数，用于将采集到的LCP数据发送到后端
 * @returns 清理函数，调用后可停止监控
 */
export function observeLCP(report: LcpReporter): () => void {
  // 环境兼容性检查：确保在浏览器环境中运行且支持PerformanceObserver API
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  // 浏览器能力检查：确认当前浏览器支持largest-contentful-paint类型的性能条目
  if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint'))
    return () => {}

  // 候选LCP元素，用于记录当前页面中最大的内容元素
  let candidate: PerformanceEntry | null = null

  // 创建PerformanceObserver实例来监听largest-contentful-paint类型的性能条目
  const obs = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    if (!entries.length)
      return

    // LCP指标会随着页面加载不断更新，始终取最后一个条目作为当前最大内容
    // 因为浏览器会在发现更大的内容时重新计算LCP
    candidate = entries[entries.length - 1]
  })

  // 开始观察largest-contentful-paint类型的性能条目，使用buffered: true获取历史数据
  obs.observe({ type: 'largest-contentful-paint', buffered: true })

  // 注册页面隐藏或用户交互时的回调，确保在用户离开页面或开始交互前上报LCP数据
  const cleanupVisibility = reportOnHiddenOrInteract(() => {
    if (!candidate)
      return

    // 上报LCP指标数据，包含丰富的归因信息
    report({
      type: 'performance',
      subType: 'LCP',
      pageUrl: location.href,
      startTime: candidate.startTime, // LCP发生的时间戳
      // @ts-expect-error
      size: candidate.size, // 最大内容元素的尺寸
      // @ts-expect-error
      elementSelector: candidate.element ? getSelector(candidate.element) : '', // 最大内容元素的CSS选择器，用于定位问题元素
      entry: candidate, // 原始性能条目，便于调试和分析
    })

    // LCP指标只需在页面生命周期结束时上报一次，上报后断开观察器
    obs.disconnect()
  }, { eventNames: ['visibilitychange', 'click', 'keydown', 'pointerdown'], options: { once: true, capture: true } })

  // 返回清理函数，允许外部手动停止监控
  return () => {
    cleanupVisibility() // 清理页面隐藏/交互监听器
    obs.disconnect() // 断开性能观察器
  }
}
