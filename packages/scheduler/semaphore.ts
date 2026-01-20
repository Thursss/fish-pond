export class Semaphore {
  private count: number
  private waiting: (() => void)[] = []

  constructor(count: number) {
    this.count = count
  }

  async acquire() {
    if (this.count > 0) {
      this.count--
      return
    }
    await new Promise<void>(resolve => this.waiting.push(resolve))
  }

  release() {
    this.count++
    const next = this.waiting.shift()
    if (next) {
      this.count--
      next()
    }
  }
}
