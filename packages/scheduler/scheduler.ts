import type { Queue, SchedulerConfig, Task, TaskOptions } from './type'
import { Semaphore } from './semaphore'
import { QueueStatus, TaskStatus } from './type'

class Scheduler<T> {
  private queues: Map<string, Queue<T>> = new Map()
  private running: number = 0
  private activeTasks: Map<string, Set<string>> = new Map()
  private taskExecutors: Map<string, any> = new Map()
  private config: SchedulerConfig

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      maxTaskConcurrent: 6,
      maxQueueConcurrent: 2,
      autoStart: true,
      retryDelay: 1000,
      priorityEnabled: false,
      ...config,
    }
  }

  // ========== 任务管理 ==========
  registerExecutor(taskType: string, executor: any): void {
    this.taskExecutors.set(taskType, executor)
  }

  addQueue(taskType: string, items: T[], options?: TaskOptions): string {
    const queueId = options?.id || this.generateId(taskType)

    // 检查队列是否已满
    if (this.config.maxQueueSize) {
      const queueSize = Array.from(this.queues.values()).reduce(
        (acc, task) => acc + task.tasks?.length || 0,
        0,
      ) + items.length

      if (queueSize >= this.config.maxQueueSize) {
        this.emit('queue:full')
        throw new Error('Queue is full')
      }
    }

    // 生成任务队列
    const tasks: Task<T>[] = items.map(data => ({
      id: this.generateId(`${taskType}_task`),
      data,
      status: TaskStatus.Pending,
      retries: 0,
      maxRetries: options?.maxRetries || 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
    const queue: Queue<T> = {
      id: queueId,
      type: taskType,
      tasks,
      taskSlots: 0,
      priority: options?.priority || 1,
      status: QueueStatus.Pending,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.queues.set(queue.id, queue)
    this.activeTasks.set(queue.id, new Set())

    if (this.config.autoStart) {
      this.start(queue.id)
    }
    return queueId
  }

  addQueues(queueIdType: string, items: T[][], options?: TaskOptions): string[] {
    return items.map(item => this.addQueue(queueIdType, item, options))
  }

  getTask(queueId: string, filter?: Omit<Task<T>, 'data'>): Task<T>[] | undefined {
    if (filter) {
      const queue = this.queues.get(queueId)
      if (!queue)
        return undefined
      const filteredTasks = queue.tasks.filter((task) => {
        let match = true
        for (const key in filter) {
          if ((task as any)[key] !== (filter as any)[key]) {
            match = false
            break
          }
        }
        return match
      })
      return filteredTasks
    }

    return this.queues.get(queueId)?.tasks
  }

  getQueue(filter?: Omit<Queue<T>, 'tasks'>): Map<string, Queue<T>> {
    if (filter) {
      const filteredQueues = new Map<string, Queue<T>>()
      this.queues.forEach((queue, id) => {
        let match = true
        for (const key in filter) {
          if ((queue as any)[key] !== (filter as any)[key]) {
            match = false
            break
          }
        }
        if (match) {
          filteredQueues.set(id, queue)
        }
      })
      return filteredQueues
    }
    return this.queues
  }

  // ==================== 队列调度 ====================
  start(queueId?: string) {
    const queues = Array.from(this.queues.values())
    const pendingQueues = queues.filter(queue => queue.status === QueueStatus.Pending)

    const queue = queueId ? this.queues.get(queueId) : pendingQueues[0]
    if (!queue || queue.status !== QueueStatus.Pending)
      return

    // 检查运行中的队列数量
    const runningQueues = queues.filter(queue => queue.status === QueueStatus.Running)
    if (this.config.maxQueueConcurrent && runningQueues.length >= this.config.maxQueueConcurrent)
      return

    queue.status = QueueStatus.Running
    while (this.running < this.config.maxTaskConcurrent!) {
      this.processQueue()
    }
  }

  private async processQueue() {
    // 获取下一个任务（考虑优先级）
    const { queue, task } = this.dequeueTask() || {}

    if (!queue) {
      this.emit('queue:empty')
      return
    }
    if (!task) {
      queue.status = QueueStatus.Completed
      this.emit('task:empty', queue)
      this.emit('queue:empty')
      return
    }

    // 检查任务状态
    if (task.status !== TaskStatus.Pending) {
      this.processQueue()
      return
    }

    // 更新任务状态
    task.status = TaskStatus.Running
    this.running += 1
    console.log('🚀 ~ Scheduler ~ processQueue ~ this.running:', this.running)
    queue.taskSlots += 1
    this.activeTasks.get(queue.id)?.add(task.id)
    task.startedAt = Date.now()
    task.updatedAt = Date.now()

    // 触发队列开始事件
    if (queue.status !== QueueStatus.Running) {
      queue.status = QueueStatus.Running
      this.emit('queue:started', queue)
      // 补充任务
      while (this.running < this.config.maxTaskConcurrent!) {
        this.processQueue()
      }
    }

    this.emit('task:started', queue.id, task)

    try {
      // TEST 模拟任务执行
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => Math.random() < 2 ? resolve() : reject(new Error('Random error')), 500 + Math.random() * 1000)
      })
      task.status = TaskStatus.Completed
      task.completedAt = Date.now()
      this.emit('task:completed', queue.id, task)
    }
    catch (error) {
      task.retries += 1
      if (task.retries > task.maxRetries) {
        task.status = TaskStatus.Failed
        task.error = error || 'Unknown error'
        this.emit('task:failed', queue.id, task)
      }
      else {
        task.status = TaskStatus.Pending
        this.emit('task:retry', queue.id, task)
      }
    }
    finally {
      task.updatedAt = Date.now()
      queue.taskSlots -= 1
      this.running -= 1
      this.activeTasks.get(queue.id)?.delete(task.id)

      this.processQueue()
    }
  }

  // ========== 工具方法 ==========
  private dequeueTask(): { queue: Queue<T>, task?: Task<T> } | undefined {
    const queues = Array.from(this.queues.values())
    if (queues.length === 0)
      return

    const pendingQueues = queues.filter(queue => queue.status === QueueStatus.Pending)
    const runningQueues = queues.filter(queue => queue.status === QueueStatus.Running)

    // 检查是否有等待的队列
    if (pendingQueues.length !== 0) {
      // 判断是否有最大并发队列限制
      if (this.config.maxQueueConcurrent) {
        while (runningQueues.length < this.config.maxQueueConcurrent) {
          const queue = pendingQueues.shift()
          if (!queue)
            break

          runningQueues.push(queue)
        }
      }
      else {
        // 启动所有等待的队列
        pendingQueues.forEach((queue) => {
          runningQueues.push(queue)
        })
      }
    }

    if (runningQueues.length === 0)
      return

    let targetQueues
    if (this.config.maxTaskConcurrent) {
      // 计算总优先级
      const allPriority = runningQueues.reduce((acc, queue) => acc + queue.priority, 0)
      targetQueues = runningQueues.sort((a, b) => {
        const ac = this.config.maxTaskConcurrent! * a.priority / allPriority - a.taskSlots
        const bc = this.config.maxTaskConcurrent! * b.priority / allPriority - b.taskSlots
        return bc - ac
      })
    }
    else {
      targetQueues = runningQueues.sort((a, b) => b.taskSlots - a.taskSlots)
    }

    const task = targetQueues[0].tasks.find(task => task.status === TaskStatus.Pending)

    return { queue: targetQueues[0], task }
  }

  private generateId(str: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    return `${str}_${timestamp}_${random}`
  }

  // ========== 事件系统 ==========
  private emit(event: string, ...args: any[]): void {
    console.log(`[Scheduler] ${event}`, ...args)
  }
}

export { Scheduler }
