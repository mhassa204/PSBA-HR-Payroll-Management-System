// Simple event bus to bridge axios interceptors with ToastProvider
export const toastBus = {
  listeners: new Set(),
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(payload) { this.listeners.forEach(fn => fn(payload)); }
};
