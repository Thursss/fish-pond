export interface TaskOptions {
  id?: string
  priority?: number
  maxRetries?: number
  metadata?: Record<string, any>
}
export const enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface Task<T> {
  id: string
  data: T
  status: TaskStatus
  retries: number
  maxRetries: number
  startedAt?: number
  createdAt: number
  updatedAt: number
  completedAt?: number
  error?: any
  metadata?: Record<string, any>
}

export const enum QueueStatus {
  Pending = 'pending',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}
export interface Queue<T> {
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

export interface SchedulerConfig {
  maxTaskConcurrent?: number
  maxQueueConcurrent?: number
  maxQueueSize?: number
  autoStart?: boolean
  retryDelay?: number
  priorityEnabled?: boolean
}
