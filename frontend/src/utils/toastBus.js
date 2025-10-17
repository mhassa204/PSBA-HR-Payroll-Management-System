// Simple event bus to bridge axios interceptors with ToastProvider
// Includes lightweight de-duplication to avoid identical toasts firing twice
// in quick succession (for example, both a route guard and an axios 403).
export const toastBus = {
  listeners: new Set(),
  // Track last emitted toast for de-duplication
  _last: { message: null, type: null, at: 0 },
  _dedupeWindowMs: 1500,
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit(payload) {
    try {
      const { message = "", type = "info", force = false } = payload || {};
      const now = Date.now();
      const sameAsLast =
        !force &&
        this._last.message === String(message) &&
        this._last.type === String(type) &&
        now - this._last.at < this._dedupeWindowMs;
      if (!sameAsLast) {
        this._last = { message: String(message), type: String(type), at: now };
        this.listeners.forEach((fn) => fn(payload));
      }
    } catch (_) {
      // best-effort emit; never throw to callers
      this.listeners.forEach((fn) => fn(payload));
    }
  },
};
