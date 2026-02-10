import { initErrorMonitor } from '@fish-pond/lighthouse/error'
import initPerformanceMonitor from '@fish-pond/lighthouse/performance'

// 初始化 Lighthouse 监控 SDK
initPerformanceMonitor({
  appVersion: '1.0.0',
  appName: 'test-app',
  appId: 'test-app-id',
  // 不配置 uploadUrl，数据将打印到控制台
  request: {
    ignoreUrls: [
      '/favicon.ico',
    ],
  },
})

initErrorMonitor({
  appVersion: '1.0.0',
  appName: 'test-app',
  appId: 'test-app-id',
})
