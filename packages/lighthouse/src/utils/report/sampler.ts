export function shouldSample(rate: number): boolean {
  if (rate >= 1)
    return true
  if (rate <= 0)
    return false
  return Math.random() < rate
}

export function shouldIgnoreUrl(url: string, ignoreUrls?: Array<string | RegExp>): boolean {
  if (!ignoreUrls || ignoreUrls.length === 0)
    return false

  return ignoreUrls.some((pattern) => {
    if (typeof pattern === 'string')
      return url.includes(pattern)

    pattern.lastIndex = 0
    return pattern.test(url)
  })
}
