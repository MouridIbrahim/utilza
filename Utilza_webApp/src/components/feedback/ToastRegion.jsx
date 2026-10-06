import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    // Auto-dismiss after 5s (errors persist slightly longer via `timeout` override)
    const timeout = toast.timeout ?? 5000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, timeout);
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastRegion() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="text-[var(--color-text-muted)]"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
