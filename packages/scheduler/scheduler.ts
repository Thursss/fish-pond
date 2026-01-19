interface TaskOptions {
  id?: string
  maxRetries?: number
}
const enum SubtaskStatus {
  Pending = 'pending',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

interface Subtask<T> {
  data: T
  status: SubtaskStatus
  retries: number
  maxRetries: number
  createdAt: number
  updatedAt: number
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
  type: string
  subtasks: Subtask<T>[]
  status: TaskStatus
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
  private queue: Map<string, Task<T>>
  private taskExecutors: Map<string, any>
  private config: SchedulerConfig

  constructor(config: SchedulerConfig = {}) {
    this.queue = new Map()
    this.taskExecutors = new Map()
    this.config = {
      maxTaskConcurrent: 2,
      maxQueueConcurrent: 6,
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

  addTask(taskType: string, items: any[], options?: TaskOptions): string {
    const taskId = options?.id || this.generateTaskId(taskType)

    // 检查队列是否已满
    if (this.config.maxQueueSize) {
      const queueSize = Array.from(this.queue.values()).reduce(
        (acc, task) => acc + task.subtasks?.length || 0,
        0,
      ) + items.length

      if (queueSize >= this.config.maxQueueSize) {
        this.emit('queue:full')
        throw new Error('Queue is full')
      }
    }

    const subtasks: Subtask<T>[] = items.map(data => ({
      data,
      status: SubtaskStatus.Pending,
      retries: 0,
      maxRetries: options?.maxRetries || 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))

    const task: Task<T> = {
      id: taskId,
      type: taskType,
      subtasks,
      status: TaskStatus.Pending,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.queue.set(task.id, task)

    if (this.config.autoStart) {
      this.processQueue()
    }

    return taskId
  }

  addTasks(taskType: string, items: any[], options?: TaskOptions): string[] {
    return items.map(item => this.addTask(taskType, item, options))
  }

  processQueue(): void {}

  // ========== 事件系统 ==========
  emit(event: string, ...args: any[]): void {
    console.log(`[Scheduler] ${event}`, ...args)
  }

  generateTaskId(taskType: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    return `${taskType}_${timestamp}_${random}`
  }
}

export { Scheduler }
