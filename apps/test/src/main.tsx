import { Scheduler } from '@fish-pond/scheduler'

const scheduler = new Scheduler({
  maxTaskConcurrent: 3,
  maxQueueSize: 100,
})

scheduler.addTask('', [1, 2])
