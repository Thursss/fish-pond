export interface SenderCustom {
  appName?: string
  appVersion?: string
  appId?: string
  environment?: string
  [key: string]: any
}

export interface SenderOptions {
  reportUrl?: string
  log?: boolean
  headers?: Record<string, string>
}

export type Reporter = (data: unknown) => void

export function createSender(options: SenderOptions = {}, base: SenderCustom = {}): Reporter {
  const reportUrl = options.reportUrl
  const log = options.log ?? true
  const headers = options.headers ?? {}

  return (data: any) => {
    const reData = { ...base, ...data }
    if (log)
      console.log('🚀 [PerformanceMonitor] log: ', data)

    if (typeof window === 'undefined')
      return

    if (!reportUrl)
      return

    const payload = JSON.stringify(reData)
    const blob = new Blob([payload], { type: 'application/json' })

    if (navigator.sendBeacon?.(reportUrl, blob))
      return

    fetch(reportUrl, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json', ...headers },
      keepalive: true,
    }).catch(() => {})
  }
}
