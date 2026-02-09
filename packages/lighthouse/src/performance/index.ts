import type { RequestObserverOptions } from './network/request.js'
import type { ResourceObserverOptions } from './network/resource.js'
import type { SenderOptions } from './report/sender.js'
import { observeFID } from './interaction/fid.js'
import { observeINP } from './interaction/inp.js'
import { observeLongTask } from './interaction/long-task.js'
import { observeFCP } from './loading/fcp.js'
import { observeFP } from './loading/fp.js'
import { observeLCP } from './loading/lcp.js'
import { observeLoad } from './loading/load.js'
import { observeRequest } from './network/request.js'

import { observeResource } from './network/resource.js'
import { createSender } from './report/sender.js'
import { observeCLS } from './visual-stability/cls.js'

export interface PerformanceMonitorOptions extends SenderOptions {
  appId: string
  ignoreUrls?: Array<string | RegExp>
  request?: RequestObserverOptions
  resource?: ResourceObserverOptions
}

export class PerformanceMonitor {
  private options: PerformanceMonitorOptions
  constructor(options: PerformanceMonitorOptions) {
    this.options = { ...{
      /** default options */
      log: true,
    }, ...options }
  }

  init() {
    const report = createSender(this.options)

    observeFP(report)
    observeFCP(report)
    observeLCP(report)
    observeLoad(report)

    // 启动交互性能监控：首次输入延迟、交互到下次绘制、长任务
    observeFID(report)
    observeINP(report)
    observeLongTask(report)

    // 构建忽略URL规则：合并基础忽略规则和上报URL，避免监控自身请求
    const baseIgnoreUrls: Array<string | RegExp> = []

    // 添加用户自定义的忽略URL规则
    if (this.options.ignoreUrls)
      baseIgnoreUrls.push(...this.options.ignoreUrls)

    // 添加上报URL到忽略列表，避免监控性能数据上报请求本身
    if (this.options.reportUrl)
      baseIgnoreUrls.push(this.options.reportUrl)

    // 构建请求监控的忽略URL列表：基础规则 + 请求特定规则
    const requestIgnoreUrls = [
      ...baseIgnoreUrls,
      ...(this.options.request?.ignoreUrls ?? []), // 合并请求特定的忽略规则
    ]

    // 构建资源监控的忽略URL列表：基础规则 + 资源特定规则
    const resourceIgnoreUrls = [
      ...baseIgnoreUrls,
      ...(this.options.resource?.ignoreUrls ?? []), // 合并资源特定的忽略规则
    ]

    // 启动网络请求监控，传入合并后的忽略规则
    observeRequest(report, {
      ...this.options.request,
      ignoreUrls: requestIgnoreUrls, // 使用合并后的请求忽略规则
    })

    // 启动资源加载监控，传入合并后的忽略规则
    observeResource(report, {
      ...this.options.resource,
      ignoreUrls: resourceIgnoreUrls, // 使用合并后的资源忽略规则
    })

    // 启动视觉稳定性监控：累积布局偏移
    observeCLS(report)
  }
}
