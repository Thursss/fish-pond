import type { ErrorReporter, JsErrorMetric, PromiseErrorMetric } from './shared'
import { buildErrorBase } from './shared'

interface NormalizedError {
  message: string
  name?: string
  stack?: string
}

interface NormalizedRejection extends NormalizedError {
  reason?: string
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string')
    return value

  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

function normalizeError(error: unknown, fallbackMessage: string): NormalizedError {
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      name: error.name,
      stack: error.stack,
    }
  }

  if (typeof error === 'string')
    return { message: error }

  if (error)
    return { message: safeStringify(error) }

  return { message: fallbackMessage }
}

function normalizeRejection(reason: unknown): NormalizedRejection {
  if (reason instanceof Error) {
    return {
      message: reason.message || 'Unhandled Promise Rejection',
      name: reason.name,
      stack: reason.stack,
    }
  }

  if (typeof reason === 'string')
    return { message: reason, reason }

  if (reason) {
    const text = safeStringify(reason)
    return { message: text, reason: text }
  }

  return { message: 'Unhandled Promise Rejection' }
}

export function monitorJavaScriptErrors(report: ErrorReporter): () => void {
  if (typeof window === 'undefined')
    return () => {}

  const originalOnError = window.onerror
  const originalOnUnhandledRejection = window.onunhandledrejection

  window.onerror = (message, source, lineno, colno, error) => {
    const messageText = typeof message === 'string' && message.trim().length > 0
      ? message
      : 'Script error'
    const normalized = normalizeError(error, messageText)

    report({
      ...buildErrorBase('js'),
      message: normalized.message,
      source: typeof source === 'string' ? source : undefined,
      lineno: typeof lineno === 'number' ? lineno : undefined,
      colno: typeof colno === 'number' ? colno : undefined,
      name: normalized.name,
      stack: normalized.stack,
    } as JsErrorMetric)

    if (typeof originalOnError === 'function')
      return originalOnError.call(window, message, source, lineno, colno, error)

    return false
  }

  window.onunhandledrejection = (event) => {
    const normalized = normalizeRejection(event.reason)

    report({
      ...buildErrorBase('promise'),
      message: normalized.message,
      reason: normalized.reason,
      name: normalized.name,
      stack: normalized.stack,
      userAgent: navigator?.userAgent,
    } as PromiseErrorMetric)

    if (typeof originalOnUnhandledRejection === 'function')
      return originalOnUnhandledRejection.call(window, event)
  }

  return () => {
    window.onerror = originalOnError
    window.onunhandledrejection = originalOnUnhandledRejection
  }
}
