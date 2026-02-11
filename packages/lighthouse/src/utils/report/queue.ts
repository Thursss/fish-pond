export interface QueueOptions<T> {
  maxBatchSize: number
  flushInterval: number
  onFlush: (events: T[]) => void
}

export class Queue<T> {
  private queue: T[] = []
  private options: QueueOptions<T>
  private timer?: number

  constructor(options: QueueOptions<T>) {
    this.options = options
  }

  /**
   * 启动队列定时刷新机制
   * 设置定时器，按照配置的时间间隔自动刷新队列中的数据
   * 确保在非浏览器环境或配置不合法时不会启动定时器
   */
  start() {
    // 环境兼容性检查：确保在浏览器环境中运行
    if (typeof window === 'undefined')
      return

    // 配置有效性检查：flushInterval必须大于0才启动定时器
    if (this.options.flushInterval <= 0)
      return

    // 先停止可能存在的旧定时器，避免重复启动导致的内存泄漏
    this.stop()

    // 创建新的定时器，按照配置的时间间隔定期执行flush操作
    this.timer = window.setInterval(() => this.flush(), this.options.flushInterval)
  }

  stop() {
    if (typeof window === 'undefined')
      return

    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = undefined
    }
  }

  size() {
    return this.queue.length
  }

  push(event: T) {
    this.queue.push(event)

    if (this.queue.length >= this.options.maxBatchSize)
      this.flush()
  }

  /**
   * 刷新队列数据
   * 将当前队列中的所有数据批量取出，并调用配置的回调函数进行处理
   * 采用原子操作确保数据处理的完整性和一致性
   */
  flush() {
    // 队列为空检查：避免不必要的处理开销
    if (this.queue.length === 0)
      return

    // 创建数据快照：使用slice()复制队列数据，避免后续操作影响当前批次
    const batch = this.queue.slice()

    // 清空原始队列：原子操作，确保数据不会丢失或重复处理
    this.queue.length = 0

    // 调用刷新回调：将批次数据传递给外部处理逻辑（如上报到服务器）
    this.options.onFlush(batch)
  }

  destroy() {
    this.stop()
    this.queue.length = 0
  }
}
