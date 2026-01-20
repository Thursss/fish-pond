type Handler = (payload: any) => void

export class EventBus {
  private listeners = new Map<string, Handler[]>()

  on(type: string, handler: Handler) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  emit(type: string, payload?: any) {
    const list = this.listeners.get(type) ?? []
    list.forEach(h => h(payload))
  }
}
