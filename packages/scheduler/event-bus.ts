type Handler = (...payload: any) => void

export class EventBus<T> {
  private listeners = new Map<T, Handler[]>()

  on(type: T, handler: Handler) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  off(type: T, handler: Handler) {
    const list = this.listeners.get(type) ?? []
    const index = list.indexOf(handler)
    if (index !== -1) {
      list.splice(index, 1)
      this.listeners.set(type, list)
    }
  }

  emit(type: T, ...payload: any) {
    const list = this.listeners.get(type) ?? []
    list.forEach(h => h(...payload))
  }
}
