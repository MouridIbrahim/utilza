import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { useSessionStore } from '../../stores/session.js';
import { queryClient } from '../../app/query-client.js';
import { logout } from '../../services/auth-service.js';
import { useToastStore } from '../feedback/ToastRegion.jsx';
import { Drawer } from '../ui/Drawer.jsx';
import { GlobalSearch } from './GlobalSearch.jsx';

export function GlobalHeader() {
  const { user, isAdmin } = useSessionStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.push);

  async function signOut() {
    try {
      await logout();
    } finally {
      useSessionStore.getState().clearSession();
      queryClient.removeQueries();
      toast({ tone: 'info', message: 'You have been signed out.' });
      setMenuOpen(false);
      navigate('/', { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="text-lg font-bold" aria-label="Utilza home">
          Utilza
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-4 text-sm md:flex">
          <Link to="/tools" className="font-medium">
            Tools
          </Link>
          <Link to="/tools" className="text-[var(--color-text-muted)]">
            Categories
          </Link>
          {user && (
            <Link to="/app/favorites" className="text-[var(--color-text-muted)]">
              Favorites
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/tools" className="text-[var(--color-text-muted)]">
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto hidden min-w-0 flex-1 max-w-sm justify-end md:flex">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            aria-label="Search tools"
            className="rounded-[10px] border border-[var(--color-border)] p-2 md:hidden"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search size={18} aria-hidden="true" />
          </button>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/app/home')}
                title={user.email}
                className="hidden max-w-40 truncate rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold sm:block"
              >
                {user.name || user.email}
              </button>
              <button
                type="button"
                onClick={signOut}
                className="hidden rounded-[10px] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-muted)] underline sm:block"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-[10px] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white sm:block"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="rounded-[10px] border border-[var(--color-border)] p-2 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-[var(--color-border)] p-3 md:hidden">
          <GlobalSearch autoFocus />
        </div>
      )}

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="mobile-nav-title">
        <h2 id="mobile-nav-title" className="text-base font-bold">
          Menu
        </h2>
        <nav aria-label="Mobile" className="mt-3 flex flex-col gap-1 text-[15px]">
          <Link to="/tools" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
            Tools
          </Link>
          <Link to="/tools" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
            Categories
          </Link>
          {user ? (
            <>
              <Link to="/app/home" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
                Home
              </Link>
              <Link to="/app/favorites" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
                Favorites
              </Link>
              <Link to="/app/history" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
                History
              </Link>
              <Link to="/app/account" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
                Account
              </Link>
              {isAdmin && (
                <Link to="/admin/tools" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
                  Admin tools
                </Link>
              )}
              <button
                type="button"
                onClick={signOut}
                className="rounded px-2 py-2 text-left hover:bg-[var(--color-surface-subtle)]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
                Sign in
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="rounded px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
                Create account
              </Link>
            </>
          )}
        </nav>
      </Drawer>
    </header>
  );
}
