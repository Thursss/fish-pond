import type { Queue, QueueEventMap, SchedulerConfig, Task, TaskExecutionContext, TaskExecutor, TaskOptions } from './type'
import { EventBus } from './event-bus'
import { QueueStatus, TaskStatus } from './type'

class Scheduler<T> {
  private queues: Map<string, Queue<T>> = new Map()
  private running: number = 0
  private activeTasks: Map<string, Set<string>> = new Map()
  private taskExecutors: Map<string, TaskExecutor<T>> = new Map()
  private config: SchedulerConfig
  private eventBus: EventBus<keyof QueueEventMap<T>> = new EventBus()

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
  registerExecutor(taskType: string, executor: TaskExecutor<T>): void {
    this.taskExecutors.set(taskType, executor)
  }

  addQueue(queueType: string, items: T[], options?: TaskOptions): string {
    const queueId = options?.id || this.generateId(queueType)

    // 检查队列是否已满
    if (this.config.maxQueueSize) {
      const queueSize = Array.from(this.queues.values()).reduce(
        (acc, task) => acc + task.tasks?.length || 0,
        0,
      ) + items.length

      if (queueSize >= this.config.maxQueueSize) {
        this.emit('queue:full', queueId)
        throw new Error('Queue is full')
      }
    }

    // 生成任务队列
    const tasks: Task<T>[] = items.map(data => ({
      id: this.generateId(`${queueType}_task`),
      data,
      status: TaskStatus.Pending,
      retries: 0,
      maxRetries: options?.maxRetries || 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))
    const queue: Queue<T> = {
      id: queueId,
      type: queueType,
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

  addQueues(queueType: string, items: T[][], options?: TaskOptions): string[] {
    return items.map(item => this.addQueue(queueType, item, options))
  }

  removeTask(queueId: string, filter?: Omit<Task<T>, 'data'>): void {
    const queue = this.queues.get(queueId)
    if (!queue)
      return

    if (filter) {
      queue.tasks = queue.tasks.filter((task) => {
        let match = true
        for (const key in filter) {
          if ((task as any)[key] !== (filter as any)[key]) {
            match = false
            break
          }
        }
        if (match) {
          if (this.activeTasks.get(queueId)?.has(task.id)) {
            this.running -= 1
            this.activeTasks.get(queueId)?.delete(task.id)
            queue.taskSlots -= 1
            task.status = TaskStatus.Cancelled
          }
          this.emit('task:removed', queueId, task)
        }
        return !match
      })
      if (queue.tasks.length === 0) {
        this.queues.delete(queueId)
        this.activeTasks.delete(queueId)
        this.emit('queue:removed', queueId)
      }
    }
    else {
      this.queues.delete(queueId)
      this.activeTasks.delete(queueId)
      this.emit('queue:removed', queueId)
    }
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

  getStats(queueId: string) {
    const queue = this.queues.get(queueId)
    if (!queue)
      return undefined

    const total = queue.tasks.length
    const completed = queue.tasks.filter(task => task.status === TaskStatus.Completed).length
    const failed = queue.tasks.filter(task => task.status === TaskStatus.Failed).length
    const pending = queue.tasks.filter(task => task.status === TaskStatus.Pending).length
    const running = queue.tasks.filter(task => task.status === TaskStatus.Running).length
    const cancelled = queue.tasks.filter(task => task.status === TaskStatus.Cancelled).length

    return { total, completed, failed, pending, running, cancelled }
  }

  // ==================== 任务控制 ====================
  pauseTask(queueId: string, filter?: Omit<Task<T>, 'data'>): void {
    const queue = this.queues.get(queueId)
    if (!queue)
      return

    if (filter) {
      queue.tasks.forEach((task) => {
        let match = true
        for (const key in filter) {
          if ((task as any)[key] !== (filter as any)[key]) {
            match = false
            break
          }
        }
        if (match && task.status === TaskStatus.Running) {
          task.status = TaskStatus.Paused
          this.emit('task:paused', queueId, task)
        }
      })
      const runningTasks = queue.tasks.filter(task => task.status === TaskStatus.Running)
      if (runningTasks.length === 0) {
        if (this.activeTasks.get(queueId)?.has(filter.id)) {
          this.running -= 1
          queue.taskSlots -= 1
          this.activeTasks.get(queueId)?.delete(filter.id)
        }
        queue.status = QueueStatus.Paused
        this.emit('queue:paused', queueId)
      }
    }
    else {
      queue.status = QueueStatus.Paused
      queue.tasks.forEach((task) => {
        if (task.status === TaskStatus.Running) {
          task.status = TaskStatus.Paused
          this.emit('task:paused', queueId, task)
        }
      })
      this.emit('queue:paused', queueId)
    }
  }

  resumeTask(queueId: string, filter?: Omit<Task<T>, 'data'>): void {
    const queue = this.queues.get(queueId)
    if (!queue)
      return

    if (filter) {
      queue.tasks.forEach((task) => {
        let match = true
        for (const key in filter) {
          if ((task as any)[key] !== (filter as any)[key]) {
            match = false
            break
          }
          if (match && task.status === TaskStatus.Paused) {
            task.status = TaskStatus.Pending
            this.emit('task:resumed', queueId, task)
          }
        }
      })
      const pendingTasks = queue.tasks.filter(task => task.status === TaskStatus.Pending)
      if (pendingTasks.length === 0 && queue.status === QueueStatus.Paused) {
        queue.status = QueueStatus.Pending
        this.emit('queue:resumed', queueId)
      }
    }
    else {
      queue.tasks.forEach((task) => {
        if (task.status === TaskStatus.Paused) {
          task.status = TaskStatus.Pending
          this.emit('task:resumed', queueId, task)
        }
      })
      queue.status = QueueStatus.Pending
      this.emit('queue:resumed', queueId)
    }
  }

  cancelTask(queueId: string, filter?: Omit<Task<T>, 'data'>): void {
    const queue = this.queues.get(queueId)
    if (!queue)
      return

    if (filter) {
      queue.tasks.forEach((task) => {
        let match = true
        for (const key in filter) {
          if ((task as any)[key] !== (filter as any)[key]) {
            match = false
            break
          }
          if (match && (task.status === TaskStatus.Pending || task.status === TaskStatus.Running || task.status === TaskStatus.Paused)) {
            if (this.activeTasks.get(queueId)?.has(task.id)) {
              this.running -= 1
              this.activeTasks.get(queueId)?.delete(task.id)
              queue.taskSlots -= 1
            }
            task.status = TaskStatus.Cancelled
            this.emit('task:cancelled', queueId, task)
          }
        }
      })
      const activeTasks = queue.tasks.filter(task => [TaskStatus.Pending, TaskStatus.Running, TaskStatus.Paused].includes(task.status))
      if (activeTasks.length === 0) {
        queue.status = QueueStatus.Cancelled
        this.emit('queue:cancelled', queueId)
      }
    }
    else {
      queue.tasks.forEach((task) => {
        if ([TaskStatus.Pending, task.status === TaskStatus.Paused, TaskStatus.Running].includes(task.status)) {
          if (this.activeTasks.get(queueId)?.has(task.id)) {
            this.running -= 1
            this.activeTasks.get(queueId)?.delete(task.id)
            queue.taskSlots -= 1
          }
          task.status = TaskStatus.Cancelled
          this.emit('task:cancelled', queueId, task)
        }
      })
      queue.status = QueueStatus.Cancelled
      this.emit('queue:cancelled', queueId)
    }
  }

  clearQueue(queueId: string, filter?: Omit<Task<T>, 'data'>): void {
    const queue = this.queues.get(queueId)
    if (!queue)
      return
    if (filter) {
      queue.tasks.forEach((task) => {
        let match = true
        for (const key in filter) {
          if ((task as any)[key] !== (filter as any)[key]) {
            match = false
            break
          }
          if (match && (task.status === TaskStatus.Pending || task.status === TaskStatus.Running || task.status === TaskStatus.Paused)) {
            if (this.activeTasks.get(queueId)?.has(task.id)) {
              this.running -= 1
              this.activeTasks.get(queueId)?.delete(task.id)
              queue.taskSlots -= 1
            }
            task.status = TaskStatus.Cancelled
            this.emit('task:cleared', queueId, task)
          }
        }
      })
      if (queue.tasks.length === 0) {
        this.queues.delete(queueId)
        this.activeTasks.delete(queueId)
        this.emit('queue:cleared', queueId)
      }
    }
    else {
      queue.tasks.forEach((task) => {
        if (this.activeTasks.get(queueId)?.has(task.id)) {
          this.running -= 1
          this.activeTasks.get(queueId)?.delete(task.id)
          queue.taskSlots -= 1
        }
        task.status = TaskStatus.Cancelled
        this.emit('task:cleared', queueId, task)
      })

      this.queues.delete(queueId)
      this.activeTasks.delete(queueId)
      this.emit('queue:cleared', queueId)
    }
  }

  // ==================== 队列调度 ====================
  start(queueId?: string) {
    const queues = Array.from(this.queues.values())
    const pendingQueues = queues.filter(queue => queue.status === QueueStatus.Pending)

    const queue = queueId ? this.queues.get(queueId) : pendingQueues[0]
    if (!queue || queue.status !== QueueStatus.Pending)
      return

    // const executor = this.taskExecutors.get(queue.type)
    // if (!executor) {
    //   throw new Error(`No executor registered for task type: ${queue.type}`)
    // }

    // 检查运行中的队列数量
    const runningQueues = queues.filter(queue => queue.status === QueueStatus.Running)
    if (this.config.maxQueueConcurrent && runningQueues.length >= this.config.maxQueueConcurrent)
      return

    queue.status = QueueStatus.Running
    this.emit('queue:started', queue.id)

    for (let i = 0; i < this.config.maxTaskConcurrent! - this.running; i++) {
      this.processQueue()
    }
  }

  private async processQueue() {
    // 获取下一个任务（考虑优先级）
    const { queue, task } = this.dequeueTask() || {}

    if (!queue) {
      this.emit('queue:completed')
      return
    }
    if (!task) {
      queue.status = QueueStatus.Completed
      this.emit('task:empty', queue.id, task)
      this.emit('queue:completed', queue.id)
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
    queue.taskSlots += 1
    this.activeTasks.get(queue.id)?.add(task.id)
    task.startedAt = Date.now()
    task.updatedAt = Date.now()

    // 触发队列开始事件
    if (queue.status !== QueueStatus.Running) {
      queue.status = QueueStatus.Running
      this.emit('queue:started', queue.id)
      // 补充任务
      for (let i = 0; i < this.config.maxTaskConcurrent! - this.running; i++) {
        this.processQueue()
      }
    }

    this.emit('task:started', queue.id, task)

    try {
      const executor = this.taskExecutors.get(queue.type)
      if (!executor) {
        throw new Error(`No executor registered for task type: ${queue.type}`)
      }
      // 创建任务执行上下文
      const context: TaskExecutionContext<T> = {
        updateTaskData: (data) => {
          this.updateTaskData(queue.id, task.id, data)
        },
        data: task.data,
      }
      await executor(task.data, context)

      // 处理执行结果
      task.status = TaskStatus.Completed
      task.completedAt = Date.now()
      this.emit('task:completed', queue.id, task)
    }
    catch (error) {
      task.retries += 1
      if (task.retries > task.maxRetries) {
        task.status = TaskStatus.Failed
        task.error = error || 'Unknown error'
        this.emit('task:failed', queue.id, task, task.error)
      }
      else {
        task.status = TaskStatus.Pending
        this.emit('task:retry', queue.id, task, task.retries)
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

  private updateTaskData(queueId: string, taskId: string, data: Partial<T>): void {
    const queue = this.queues.get(queueId)
    if (!queue)
      return
    const task = queue.tasks.find(task => task.id === taskId)
    if (!task)
      return

    if (typeof task.data === 'object') {
      task.data = { ...task.data, ...data }
    }
    else {
      task.data = {
        ...task.data,
        ...data,
      }
    }
    this.emit('task:dataUpdated', queueId, task.data, task)
  }

  private generateId(str: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    return `${str}_${timestamp}_${random}`
  }

  // ========== 事件系统 ==========
  on<K extends keyof QueueEventMap<T>>(event: K, handler: (...args: QueueEventMap<T>[K]) => void): void {
    this.eventBus.on(event, handler)
  }

  off<K extends keyof QueueEventMap<T>>(event: K, handler: (...args: QueueEventMap<T>[K]) => void): void {
    this.eventBus.off(event, handler)
  }

  private emit<K extends keyof QueueEventMap<T>>(event: K, ...args: QueueEventMap<T>[K]): void {
    this.eventBus.emit(event, ...args)
  }
}

export { Scheduler }
