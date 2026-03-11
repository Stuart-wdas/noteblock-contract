// /lib/eventBus.ts
type Handler = (...args: any[]) => void;

class EventBus {
  private events = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: Handler) {
    this.events.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]) {
    this.events.get(event)?.forEach((handler) => {
      handler(...args);
    });
  }
}

export const eventBus = new EventBus();
