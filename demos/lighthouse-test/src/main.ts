import { init } from '@fish-pond/lighthouse'

// 初始化 Lighthouse 监控 SDK
const lighthouse = init({
  appId: 'test-app-id',
  // 不配置 uploadUrl，数据将打印到控制台
  enablePerformance: true,
  enableError: true,
  enableBehavior: true,
  sampleRate: 1,
  beforeSend: (data: any) => {
    console.log('Before sending data:', data)
    return data
  },
})

// 启动监控
lighthouse.start()
