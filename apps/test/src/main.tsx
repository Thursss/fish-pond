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

scheduler.addQueue('up1', genTasks(117, 0), {
  priority: 1,
})
scheduler.addQueue('up2', genTasks(113, 0), {
  priority: 1,
})
scheduler.addQueues('up3', [genTasks(15, 0), genTasks(3, 0)])
