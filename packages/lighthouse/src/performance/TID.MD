**可落地技术文档**

```markdown
# 前端性能监控 SDK - 技术实现文档（v1.0）

## 1. 项目目标与范围

**目标**：
开发一个**轻量、可控、可归因**的前端性能监控 SDK，覆盖 Core Web Vitals（FP/FCP/LCP/FID/INP/CLS） + 页面加载 + 资源/接口性能 + 长任务监控，支持生产级上报策略。

**不依赖**：web-vitals / Sentry 等第三方库
**技术栈**：原生 PerformanceObserver + sendBeacon/fetch(keepalive) + TypeScript
**体积目标**：< 8KB gzip
**适用场景**：PC + 移动端 H5 / SPA / MPA

## 2. 整体架构分层

```

采集层 (Collectors) → 处理层 (Processor) → 上报层 (Reporter)
↑ ↑ ↑
配置中心 (Configurator) 工具函数 (Utils) 缓冲队列 (Queue)

```

- **采集层**：按 Web Vitals 分类（Loading / Interaction / Visual Stability / Network）
- **处理层**：指标计算、归因（选择器、attribution）、数据格式化
- **上报层**：采样、批量/实时、双保险发送（beacon + fetch keepalive）
- **配置中心**：采样率、reportUrl、debug 模式、忽略规则

## 3. 推荐项目目录结构

```

performance-monitor/
├── src/
│ ├── index.ts # 对外入口 & init 方法
│ ├── types.ts # 类型定义（PerformanceEntry 扩展等）
│ ├── config.ts # 默认配置 + merge
│ ├──
│ ├── loading/ # 加载性能
│ │ ├── fp.ts
│ │ ├── fcp.ts
│ │ ├── lcp.ts
│ │ └── load.ts
│ ├── interaction/ # 交互性能
│ │ ├── fid.ts
│ │ ├── inp.ts
│ │ └── long-task.ts
│ ├── visual-stability/
│ │ └── cls.ts
│ ├── network/ # 资源 & 接口
│ │ ├── resource.ts
│ │ └── request.ts
│ ├── report/
│ │ ├── queue.ts # 内存队列 + flush 逻辑
│ │ ├── sender.ts # beacon / fetch 实现
│ │ └── sampler.ts # 采样器
│ ├── util/
│ │ ├── selector.ts # getSelector
│ │ ├── uuid.ts
│ │ ├── on-visibility.ts # visibilitychange 工具
│ │ └── device.ts # ua / screen / networkInfo
│ └── error/ # 可选：全局错误捕获
└── test/ # 靶场页面（多种场景 case）

````

## 4. 核心指标采集实现（关键代码逻辑）

### 4.1 FP / FCP（首次绘制 / 首次内容绘制）

```ts
// loading/fp.ts (FCP 同理，仅 name 判断不同)
import { report } from '../report/sender';

export function observePaint() {
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-paint' || entry.name === 'first-contentful-paint') {
        report({
          type: 'performance',
          subType: entry.name,
          pageUrl: location.href,
          startTime: entry.startTime,
          ...entry.toJSON(),
        });
        obs.disconnect();
      }
    }
  });
  obs.observe({ type: 'paint', buffered: true });
}
````

### 4.2 LCP（最大内容绘制） - 带归因

```ts
import { reportOnHiddenOrInteract } from '../util/on-visibility'
// loading/lcp.ts
import { getSelector } from '../util/selector'

let candidate: PerformanceLargestContentfulPaint | null = null

const obs = new PerformanceObserver((list) => {
  candidate = list.getEntries().at(-1) as PerformanceLargestContentfulPaint | null
})

obs.observe({ type: 'largest-contentful-paint', buffered: true })

reportOnHiddenOrInteract(() => {
  if (!candidate)
    return
  report({
    type: 'performance',
    subType: 'LCP',
    value: candidate.startTime,
    elementSelector: candidate.element ? getSelector(candidate.element) : '',
    size: candidate.size,
    url: candidate.url || '',
    pageUrl: location.href,
  })
  obs.disconnect()
})
```

### 4.3 CLS（累积布局偏移）

```ts
// visual-stability/cls.ts
let clsValue = 0

const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!(entry as any).hadRecentInput) {
      clsValue += (entry as any).value
    }
  }
})

obs.observe({ type: 'layout-shift', buffered: true })

reportOnHiddenOrInteract(() => {
  report({ type: 'performance', subType: 'CLS', value: clsValue })
})
```

### 4.4 FID / INP（首次输入延迟 / 交互到下次绘制）

FID 只取首次，INP 持续收集最差值（建议维护数组取 p75/p90/p99）。

```ts
// interaction/fid.ts
const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const fid = entry.processingStart - entry.startTime
    report({ type: 'interaction', subType: 'FID', value: fid })
    obs.disconnect()
  }
})
obs.observe({ type: 'first-input', buffered: true })
```

### 4.5 长任务监控（>50ms）

```ts
const obs = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 50) {
      report({
        type: 'longtask',
        duration: entry.duration,
        attribution: entry.attribution?.map(a => ({
          name: a.name,
          containerSrc: a.containerSrc,
        })),
      })
    }
  })
})
obs.observe({ type: 'longtask', buffered: true })
```

### 4.6 资源 & 接口性能

```ts
// network/resource.ts & request.ts
const obs = new PerformanceObserver((list) => {
  list.getEntriesByType('resource').forEach((entry) => {
    if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
      // 接口
      const ttfb = entry.responseStart - entry.requestStart
      report({ type: 'network', subType: 'request', ttfb, duration: entry.duration, name: entry.name })
    }
    else if (entry.duration > 800 || entry.transferSize > 200 * 1024) {
      // 大/慢资源告警
      report({ type: 'network', subType: 'resource', duration: entry.duration, initiatorType: entry.initiatorType })
    }
  })
})
obs.observe({ type: 'resource', buffered: true })
```

## 5. 上报策略（生产级设计）

```ts
// report/queue.ts & sender.ts
const queue: any[] = []
let timer: number | null = null

export function push(data: any) {
  queue.push(data)
  if (queue.length >= 20 || data.priority === 'high') {
    flush()
  }
  else if (!timer) {
    timer = window.setTimeout(flush, 8000)
  }
}

function flush() {
  if (timer)
    clearTimeout(timer)
  timer = null
  if (queue.length === 0)
    return

  const batch = queue.splice(0, queue.length)
  const payload = { sessionId: getSessionId(), data: batch }

  sendWithBeaconOrFetch(payload)
}

function sendWithBeaconOrFetch(data: any) {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })

  if (navigator.sendBeacon?.(reportUrl, blob))
    return

  fetch(reportUrl, {
    method: 'POST',
    body: json,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    // 可选：降级存 IndexedDB 延迟重试
  })
}
```

**上报时机**：

- 队列 ≥ 20 条 → 立即
- 每 8 秒 flush 一次
- visibilitychange → hidden → 立即 flush
- pagehide / beforeunload → 强制 flush
- 错误 / 长任务 / LCP 超阈值 → 优先级上报（实时）

## 6. 配置与初始化示例

```ts
// 使用方式
import PerformanceMonitor from './index'

const monitor = new PerformanceMonitor({
  reportUrl: 'https://your.domain/api/performance',
  sampleRate: { LCP: 1, CLS: 0.5, resource: 0.1 },
  debug: process.env.NODE_ENV !== 'production',
  ignoreUrls: [/analytics/, /sentry/],
  custom: { appVersion: '1.2.3', userId: 'xxx' },
})

monitor.init() // 启动所有 observer
```

## 7. 生产级优化 & 注意事项

- **归因能力**：LCP → elementSelector；长任务 → attribution；接口 → url + initiator
- **弱网/关闭页面**：sendBeacon + keepalive 双保险，几乎不丢数据
- **性能开销**：buffered: true + disconnect + durationThreshold 减少 Observer 负担
- **SPA 适配**：监听 history.pushState / popstate / hashchange，重置部分指标
- **采样策略**：核心指标（LCP/CLS）默认 100%，资源/接口降采样 10-30%
- **隐私合规**：不上报 URL 参数中的敏感信息，可脱敏
- **后续扩展**：FMP（首屏渲染完成）、FPS、静态资源失败率、离线缓存重试

## 8. 推荐迭代方向

1. 支持 INP p75/p90 计算与上报
2. 增加 MutationObserver 辅助 FMP 计算
3. 离线缓存 + IndexedDB 重试机制
4. 与业务埋点关联（页面 pv/uv、组件曝光）
5. 控制台 warning：当指标超标时打印建议优化方向

```

```
