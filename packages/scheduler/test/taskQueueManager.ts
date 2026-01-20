// manager.ts
import { EventBus } from '../event-bus'
import { Semaphore } from '../semaphore'

// types.ts
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
export type QueueStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface Task {
  id: string
  status: TaskStatus
  run: () => Promise<void>
}

export interface SubQueue {
  id: string
  tasks: Task[]
}

export interface Queue {
  id: string
  subQueues: SubQueue[]
}

export class TaskQueueManager {
  private queues: Queue[] = []
  private activeQueues = new Set<string>()
  private eventBus = new EventBus()
  private globalSemaphore: Semaphore
  private maxActiveQueues: number

  constructor(
    maxActiveQueues: number,
    maxNetworkConcurrency: number,
  ) {
    this.maxActiveQueues = maxActiveQueues
    this.globalSemaphore = new Semaphore(maxNetworkConcurrency)
  }

  on(event: string, handler: (payload: any) => void) {
    this.eventBus.on(event, handler)
  }

  addQueue(queue: Queue) {
    this.queues.push(queue)
    this.schedule()
  }

  private async schedule() {
    if (this.activeQueues.size >= this.maxActiveQueues)
      return

    const next = this.queues.find(q => !this.activeQueues.has(q.id))
    if (!next)
      return

    this.activateQueue(next)
  }

  private async activateQueue(queue: Queue) {
    this.activeQueues.add(queue.id)
    this.eventBus.emit('QUEUE_STARTED', queue.id)

    try {
      for (const sub of queue.subQueues) {
        await this.runSubQueue(sub)
      }
      this.eventBus.emit('QUEUE_COMPLETED', queue.id)
    }
    catch {
      this.eventBus.emit('QUEUE_FAILED', queue.id)
    }

    this.activeQueues.delete(queue.id)
    this.schedule()
  }

  private async runSubQueue(sub: SubQueue) {
    this.eventBus.emit('SUBQUEUE_STARTED', sub.id)

    await Promise.all(
      sub.tasks.map(t => this.runTask(t)),
    )

    this.eventBus.emit('SUBQUEUE_COMPLETED', sub.id)
  }

  private async runTask(task: Task) {
    this.eventBus.emit('TASK_STARTED', task.id)
    task.status = 'running'

    await this.globalSemaphore.acquire()
    try {
      await task.run()
      task.status = 'success'

      this.eventBus.emit('TASK_COMPLETED', task.id)
    }
    catch (err) {
      task.status = 'failed'
      this.eventBus.emit('TASK_FAILED', { id: task.id, err })
    }
    finally {
      this.globalSemaphore.release()
    }
  }
}
