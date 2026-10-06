import { NavLink } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.js';

const items = [
  { to: '/app/home', label: 'Home' },
  { to: '/app/favorites', label: 'Favorites' },
  { to: '/app/history', label: 'History' },
  { to: '/app/account', label: 'Account' },
  { to: '/app/subscription', label: 'Subscription' },
];

export function AccountNav() {
  const { isAdmin } = useSessionStore();
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-[var(--color-surface-subtle)] font-semibold' : 'hover:bg-[var(--color-surface-subtle)]'
            }`
          }
        >
          {i.label}
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin/tools"
          className="whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-subtle)]"
        >
          Admin
        </NavLink>
      )}
    </nav>
  );
}

export function AdminNav() {
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto">
      <NavLink
        to="/admin/tools"
        className={({ isActive }) =>
          `whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-medium ${isActive ? 'bg-[var(--color-surface-subtle)] font-semibold' : 'hover:bg-[var(--color-surface-subtle)]'}`
        }
      >
        Tools
      </NavLink>
      <NavLink
        to="/admin/users"
        className={({ isActive }) =>
          `whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-medium ${isActive ? 'bg-[var(--color-surface-subtle)] font-semibold' : 'hover:bg-[var(--color-surface-subtle)]'}`
        }
      >
        Users
      </NavLink>
    </nav>
  );
}
