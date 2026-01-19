interface TaskOptions {
  id?: string
  priority?: number
  maxRetries?: number
  metadata?: Record<string, any>
}
const enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

interface Task<T> {
  id: string
  data: T
  status: TaskStatus
  retries: number
  maxRetries: number
  startedAt?: number
  createdAt: number
  updatedAt: number
  completedAt?: number
  error?: string
  metadata?: Record<string, any>
}

const enum QueueStatus {
  Pending = 'pending',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}
interface Queue<T> {
  id: string
  type: string
  /** 任务槽位 */
  taskSlots: number
  priority: number
  tasks: Task<T>[]
  status: QueueStatus
  createdAt: number
  updatedAt: number
}

interface SchedulerConfig {
  maxTaskConcurrent?: number
  maxQueueConcurrent?: number
  maxQueueSize?: number
  autoStart?: boolean
  retryDelay?: number
  priorityEnabled?: boolean
}

class Scheduler<T> {
  private queues: Map<string, Queue<T>> = new Map()
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

    if (this.config.autoStart) {
      this.processQueue()
    }

    return queueId
  }

  addQueues(queueIdType: string, items: T[][], options?: TaskOptions): string[] {
    return items.map(item => this.addQueue(queueIdType, item, options))
  }

  getQueue(queueId: string): Queue<T> | undefined {
    return this.queues.get(queueId)
  }

  getAllQueue(): Map<string, Queue<T>> {
    return this.queues
  }

  // ==================== 队列调度 ====================
  start(queueId?: string) {
    const queue = queueId ? this.queues.get(queueId) : Array.from(this.queues.values()).find(q => q.status === QueueStatus.Pending)
    if (!queue)
      return

    queue.status = QueueStatus.Running
    this.processQueue()
  }

  private processQueue() {
    // 获取下一个任务（考虑优先级）
    const { queueId, task } = this.dequeueTask() || {}
    if (!task || !queueId)
      return
    // 检查任务状态
    if (task.status !== TaskStatus.Pending) {
      this.processQueue()
    }

    // 更新任务状态
    task.status = TaskStatus.Running
    task.startedAt = Date.now()
    task.updatedAt = Date.now()
    this.activeTasks.get(queueId)?.add(task.id)

    console.log('🚀 ~ Scheduler ~ processQueue ~ task:', task)
  }

  // ========== 工具方法 ==========
  private dequeueTask(): { queueId: string, task: Task<T> } | undefined {
    const queues = Array.from(this.queues.values())
    if (queues.length === 0)
      return

    const pendingQueues = queues.filter(queue => queue.status === QueueStatus.Pending)
    const runningQueues = queues.filter(queue => queue.status === QueueStatus.Running)

    // 检查是否有等待的队列
    if (this.config.maxQueueConcurrent && runningQueues.length < this.config.maxQueueConcurrent) {
      while (runningQueues.length < this.config.maxQueueConcurrent) {
        const queue = pendingQueues.shift()
        if (!queue)
          break

        queue.status = QueueStatus.Running
        runningQueues.push(queue)
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
    if (!task)
      return

    return { queueId: targetQueues[0].id, task }
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
