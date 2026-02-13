import initErrorMonitor from '@fish-pond/lighthouse/error'
import initPerformanceMonitor from '@fish-pond/lighthouse/performance'

import { createRoot } from 'react-dom/client'
import { App } from './app'

// 初始化 Lighthouse 监控 SDK
initPerformanceMonitor({
  custom: {
    appVersion: '1.0.0',
    appName: 'test-app',
    appId: 'test-app-id',
  // 不配置 uploadUrl，数据将打印到控制台
  },
})

initErrorMonitor({
  custom: {
    appVersion: '1.0.0',
    appName: 'test-app',
    appId: 'test-app-id',
  // 不配置 uploadUrl，数据将打印到控制台
  },
})

createRoot(document.getElementById('app')!).render(<App />)
