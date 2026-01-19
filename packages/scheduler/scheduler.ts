interface TaskOptions {
  id?: string
  maxRetries?: number
}

interface Subtask {
  data: any
  status: 'pending' | 'completed' | 'failed'
  retries: number
  maxRetries: number
  createdAt: number
  updatedAt: number
}

interface Task {
  id: string
  type: string
  subtasks: Subtask[]
  status: 'pending' | 'completed' | 'failed'
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

class Scheduler {
  private queue: Map<string, Task>
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

  registerExecutor(taskType: string, executor: any): void {
    // Replace Function with a more specific type if known
    this.taskExecutors.set(taskType, executor)
  }

  addTask(taskType: string, items: any[], options?: TaskOptions): string {
    // Replace 'any' with a more specific type if known
    const taskId = options?.id || this.generateTaskId(taskType)

    if (this.config.maxQueueSize) {
      const queueSize = Array.from(this.queue.values()).reduce(
        (acc, task) => acc + task.subtasks.length,
        0,
      )
      if (queueSize >= this.config.maxQueueSize) {
        this.emit('queue:full')
        throw new Error('Queue is full')
      }
    }

    const subtasks = items.map(data => ({
      data,
      status: 'pending' as const,
      retries: 0,
      maxRetries: options?.maxRetries || 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))

    const task = {
      id: taskId,
      type: taskType,
      subtasks,
      status: 'pending' as const,
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
    // Replace 'any' with a more specific type if known
    return items.map(item => this.addTask(taskType, item, options))
  }

  processQueue(): void {}

  emit(event: string, ...args: any[]): void {
    // Replace 'any' with a more specific type if known
    console.log(`[Scheduler] ${event}`, ...args)
  }

  generateTaskId(taskType: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    return `${taskType}_${timestamp}_${random}`
  }
}

export { Scheduler }
