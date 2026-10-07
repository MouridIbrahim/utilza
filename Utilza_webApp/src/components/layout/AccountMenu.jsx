import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.js';
import { useLogout } from '../../features/auth/hooks/useAuth.js';

const links = [
  { to: '/app/home', label: 'Home' },
  { to: '/app/favorites', label: 'Favorites' },
  { to: '/app/history', label: 'History' },
  { to: '/app/account', label: 'Account' },
  { to: '/app/subscription', label: 'Subscription' },
];

export function AccountMenu({ onNavigate }) {
  const { user, isAdmin } = useSessionStore();
  const { signOut } = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  if (!user) return null;
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.email}`}
        title={user.email}
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-[var(--shadow-card)]"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', color: '#fff' }}
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-pop)]"
        >
          <p className="truncate px-3 py-2 text-[13px] text-[var(--color-text-muted)]">{user.email}</p>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="block rounded-[10px] px-3 py-2 text-sm hover:bg-[var(--color-surface-subtle)]"
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin/tools"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="block rounded-[10px] px-3 py-2 text-sm hover:bg-[var(--color-surface-subtle)]"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full rounded-[10px] px-3 py-2 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-surface-subtle)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
