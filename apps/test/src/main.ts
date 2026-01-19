import { Scheduler } from '@fish-pond/scheduler'

const scheduler = new Scheduler({
  maxTaskConcurrent: 3,
})
console.log('🚀 ~ scheduler:', scheduler)
