import { useEffect, useRef } from 'react';

export function Drawer({ open, onClose, labelledBy, children }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    panelRef.current?.querySelector('button, [href], input')?.focus();
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (triggerRef.current?.focus) triggerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="absolute right-0 top-0 h-full w-80 max-w-[90vw] overflow-y-auto bg-[var(--color-surface)] p-4 shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}
