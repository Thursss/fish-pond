import type { SenderBase } from '../utils/report/sender'
import type { ErrorReporter, NetworkErrorMetric } from './shared'
import { buildErrorBase, getFetchMethod, getFetchUrl, now, resolveUrl, shouldIgnoreUrl } from './shared'

export interface NetworkMonitorOptions extends SenderBase {
  ignoreUrls?: Array<string | RegExp>
}

interface NetworkSubscription {
  report: ErrorReporter
  ignoreUrls?: Array<string | RegExp>
}

const XHR_META = Symbol('lighthouse_xhr_meta')
interface XhrMeta {
  method: string
  url: string
  startTime?: number
  reported: boolean
  listenersAttached: boolean
}

type XhrWithMeta = XMLHttpRequest & { [XHR_META]?: XhrMeta }

type XhrOpen = (this: XMLHttpRequest, method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) => void
type XhrSend = (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) => void
let isPatched = false
let originalXhrOpen: XhrOpen | null = null
let originalXhrSend: XhrSend | null = null
let originalFetch: typeof window.fetch | null = null

function emitNetworkError(options: NetworkSubscription, payload: Omit<NetworkErrorMetric, 'type' | 'subType' | 'pageUrl' | 'timestamp' | 'projectName' | 'environment'>) {
  if (shouldIgnoreUrl(payload.url, options.ignoreUrls)) {
    return
  }

  options.report({
    ...buildErrorBase('network'),
    ...payload,
  } as NetworkErrorMetric)
}

function patchNetworkApis(options: NetworkSubscription) {
  if (isPatched || typeof window === 'undefined')
    return

  originalXhrOpen = XMLHttpRequest.prototype.open as XhrOpen
  originalXhrSend = XMLHttpRequest.prototype.send as XhrSend

  XMLHttpRequest.prototype.open = function (method, url, async, username, password) {
    const xhr = this as XhrWithMeta
    const resolvedUrl = resolveUrl(typeof url === 'string' ? url : url.toString())
    xhr[XHR_META] = {
      method: String(method).toUpperCase(),
      url: resolvedUrl,
      reported: false,
      listenersAttached: false,
    }

    return originalXhrOpen!.call(this, method, url, async, username, password)
  } as XhrOpen

  XMLHttpRequest.prototype.send = function (body) {
    const xhr = this as XhrWithMeta
    const meta = xhr[XHR_META]
    if (meta && !meta.listenersAttached) {
      meta.listenersAttached = true
      meta.startTime = Date.now()

      const reportOnce = (errorType: NetworkErrorMetric['errorType']) => {
        const current = xhr[XHR_META]
        if (!current || current.reported)
          return

        current.reported = true
        const duration = typeof current.startTime === 'number' ? Math.max(0, now() - current.startTime) : undefined

        emitNetworkError(options, {
          url: current.url,
          method: current.method,
          status: xhr.status || undefined,
          statusText: xhr.statusText || undefined,
          startTime: meta.startTime,
          duration,
          initiatorType: 'xmlhttprequest',
          errorType,
        })
      }

      xhr.addEventListener('error', () => reportOnce('error'))
      xhr.addEventListener('timeout', () => reportOnce('timeout'))
      xhr.addEventListener('abort', () => reportOnce('abort'))
      xhr.addEventListener('loadend', () => {
        const current = xhr[XHR_META]
        if (!current || current.reported)
          return

        const status = xhr.status
        if (status === 0)
          reportOnce('error')
        else if (status >= 400)
          reportOnce('http')
      })
    }

    if (meta && typeof meta.startTime !== 'number')
      meta.startTime = now()

    return originalXhrSend!.call(this, body)
  }

  if (typeof window.fetch === 'function') {
    originalFetch = window.fetch
    window.fetch = async (input, init) => {
      const startTime = now()
      const url = resolveUrl(getFetchUrl(input))
      const method = getFetchMethod(input, init)

      try {
        const response = await originalFetch!.call(window, input, init)
        if (!response.ok) {
          emitNetworkError(options, {
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            startTime,
            duration: Math.max(0, now() - startTime),
            initiatorType: 'fetch',
            errorType: 'http',
          })
        }
        return response
      }
      catch (error) {
        emitNetworkError(options, {
          url,
          method,
          startTime,
          duration: Math.max(0, now() - startTime),
          initiatorType: 'fetch',
          errorType: 'error',
          statusText: error instanceof Error ? error.message : undefined,
        })
        throw error
      }
    }
  }

  isPatched = true
}

function restoreNetworkApis() {
  if (!isPatched)
    return

  if (originalXhrOpen)
    XMLHttpRequest.prototype.open = originalXhrOpen

  if (originalXhrSend)
    XMLHttpRequest.prototype.send = originalXhrSend

  if (originalFetch)
    window.fetch = originalFetch

  originalXhrOpen = null
  originalXhrSend = null
  originalFetch = null
  isPatched = false
}

export function monitorNetworkErrors(report: ErrorReporter, options: NetworkMonitorOptions = {}): () => void {
  if (typeof window === 'undefined')
    return () => {}

  patchNetworkApis({
    report,
    ignoreUrls: options.ignoreUrls,
  })

  return () => restoreNetworkApis()
}
