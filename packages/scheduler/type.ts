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

export interface TaskExecutionContext<T> {
  updateTaskData: (data: Partial<T>) => void
  data: T
}
export type TaskExecutor<T = any> = (
  data: T,
  context: TaskExecutionContext<T>,
) => Promise<void>

export interface SchedulerConfig {
  maxTaskConcurrent?: number
  maxQueueConcurrent?: number
  maxQueueSize?: number
  autoStart?: boolean
  retryDelay?: number
  priorityEnabled?: boolean
}

export interface QueueEventMap<T> {
  'queue:full': [queueId: string]
  'queue:removed': [queueId: string]
  'queue:started': [queueId: string]
  'queue:paused': [queueId: string]
  'queue:cancelled': [queueId: string]
  'queue:resumed': [queueId: string]
  'queue:completed': [queueId?: string]
  'queue:failed': [queueId: string]
  'queue:cleared': [queueId: string]
  'queue:empty': [queueId?: string]
  'task:started': [queueId: string, task: Task<T>]
  'task:resumed': [queueId: string, task: Task<T>]
  'task:paused': [queueId: string, task: Task<T>]
  'task:cancelled': [queueId: string, task: Task<T>]
  'task:removed': [queueId: string, task: Task<T>]
  'task:completed': [queueId: string, task: Task<T>]
  'task:failed': [queueId: string, task: Task<T>, error: any]
  'task:retry': [queueId: string, task: Task<T>, attempt: number]
  'task:cleared': [queueId: string, task: Task<T>]
  'task:empty': [queue: string, task?: Task<T>]
  'task:dataUpdated': [queueId: string, data: T, task?: Task<T> ]
}
