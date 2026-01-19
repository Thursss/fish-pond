import { Scheduler } from '@fish-pond/scheduler'

const tasks = Array.from({ length: 1000 }).fill(0).map((_, i) => ({
  file: new File([`${i}`], `${i}.txt`),
  progress: 0,
}))

const scheduler = new Scheduler<{
  uploadId?: string
  progress?: number
  file: File
}>({
  // maxTaskConcurrent: 0,
  // maxTaskConcurrent: 6,
  // autoStart: false,
})

scheduler.addQueue('upload-file', tasks, {
  priority: 1,
})
scheduler.addQueue('upload-file', tasks, {
  priority: 3,
})
scheduler.addQueues('upload-file', [tasks, tasks])
