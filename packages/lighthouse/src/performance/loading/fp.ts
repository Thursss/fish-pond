export interface FpMetric {
  type: 'performance'
  subType: 'FP'
  name: 'first-paint'
  pageUrl: string
  startTime: number
  entry: PerformancePaintTiming
}

export type FpReporter = (metric: FpMetric) => void

/**
 * 监控首次绘制（First Paint）指标
 * FP 表示浏览器开始渲染任何内容的时刻，即屏幕从纯白变成其他颜色的瞬间
 *
 * @param report - 上报函数，用于将采集到的FP数据发送到后端
 * @returns 清理函数，调用后可停止监控
 */
export function observeFP(report: FpReporter): () => void {
  // 环境兼容性检查：确保在浏览器环境中运行且支持PerformanceObserver API
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined')
    return () => {}

  // 浏览器能力检查：确认当前浏览器支持paint类型的性能条目
  if (!PerformanceObserver.supportedEntryTypes?.includes('paint'))
    return () => {}

  // 创建PerformanceObserver实例来监听paint类型的性能条目
  const obs = new PerformanceObserver((list) => {
    // 遍历所有捕获到的paint条目
    for (const entry of list.getEntries()) {
      // 只处理首次绘制（first-paint）条目
      if (entry.name === 'first-paint') {
        // 上报FP指标数据
        report({
          type: 'performance',
          subType: 'FP',
          name: 'first-paint',
          pageUrl: location.href,
          startTime: entry.startTime,
          entry: entry as PerformancePaintTiming,
        })
        // FP指标只需捕获一次，上报后立即断开观察器以节省资源
        obs.disconnect()
        break
      }
    }
  })

  // 开始观察paint类型的性能条目，使用buffered: true获取历史数据
  obs.observe({ type: 'paint', buffered: true })

  // 返回清理函数，允许外部手动停止监控
  return () => obs.disconnect()
}
