import { Scheduler } from '@fish-pond/scheduler'

function genTasks(c: number = 5, r: number = 5) {
  return Array.from({ length: c + Math.ceil(Math.random() * r) }).fill(0).map((_, i) => ({
    file: new File([`${i}`], `${i}.txt`),
    progress: 0,
  }))
}

const scheduler = new Scheduler<{
  uploadId?: string
  progress?: number
  file: File
}>({
  // maxTaskConcurrent: 0,
  // maxTaskConcurrent: 6,
  // autoStart: false,
})
scheduler.registerExecutor('up1', async (data) => {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log('🚀 ~ data:', data)
      resolve()
    }, 100 + Math.random() * 5000)
  })
})

scheduler.addQueue('up1', genTasks(), {
  priority: 1,
})
scheduler.addQueue('up2', genTasks(113, 0), {
  priority: 1,
})
scheduler.addQueues('up3', [genTasks(15, 0), genTasks(3, 0)])

scheduler.on('queue:started', (...args) => {
  console.log('queue started:', ...args)
})
scheduler.on('task:started', (...args) => {
  console.log('task started:', ...args)
})
scheduler.on('task:completed', (...args) => {
  console.log('task completed:', ...args)
})
scheduler.on('task:failed', (...args) => {
  console.log('task failed:', ...args)
})
scheduler.on('queue:completed', (...args) => {
  console.log('queue completed:', ...args)
})
