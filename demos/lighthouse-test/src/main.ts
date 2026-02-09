import { PerformanceMonitor } from '@fish-pond/lighthouse/performance'

// 初始化 Lighthouse 监控 SDK
const lighthouse = new PerformanceMonitor({
  appId: 'test-app-id',
  reportUrl: 'http://localhost:3000/monitor',
  // 不配置 uploadUrl，数据将打印到控制台
  request: {
    ignoreUrls: [
      '/favicon.ico',
    ],
  },
})

lighthouse.init()
