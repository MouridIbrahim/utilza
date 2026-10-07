import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { useSessionStore } from '../../stores/session.js';
import { usePaletteStore } from '../../stores/palette.js';
import { Drawer } from '../ui/Drawer.jsx';
import { Logo } from './Logo.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { SearchTrigger } from '../../features/search/components/SearchPalette.jsx';

export function GlobalHeader() {
  const { user, isAdmin } = useSessionStore();
  const { setOpen } = usePaletteStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
        <Logo />
        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 text-sm md:flex">
          <Link to="/tools" className="rounded-[10px] px-3 py-2 font-medium hover:bg-[var(--color-surface-subtle)]">
            Tools
          </Link>
          <Link to="/tools" className="rounded-[10px] px-3 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]">
            Categories
          </Link>
          {isAdmin && (
            <Link to="/admin/tools" className="rounded-[10px] px-3 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]">
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger className="hidden sm:flex" />
          <button
            type="button"
            aria-label="Search tools"
            className="rounded-[10px] border border-[var(--color-border)] p-2 sm:hidden"
            onClick={() => setOpen(true)}
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <span className="hidden sm:block">
            <ThemeToggle />
          </span>
          {user ? (
            <AccountMenu />
          ) : (
            <Link
              to="/login"
              className="btn-primary hidden rounded-[10px] px-4 py-2 text-sm font-semibold sm:block"
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

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="mobile-nav-title">
        <div className="flex items-center justify-between">
          <h2 id="mobile-nav-title" className="text-base font-bold">Menu</h2>
          <ThemeToggle />
        </div>
        <nav aria-label="Mobile" className="mt-3 flex flex-col gap-1 text-[15px]">
          <Link to="/tools" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 font-medium hover:bg-[var(--color-surface-subtle)]">
            Tools
          </Link>
          <Link to="/tools" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">
            Categories
          </Link>
          {user ? (
            <>
              <Link to="/app/home" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">Home</Link>
              <Link to="/app/favorites" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">Favorites</Link>
              <Link to="/app/history" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">History</Link>
              <Link to="/app/account" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">Account</Link>
              {isAdmin && (
                <Link to="/admin/tools" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">Admin tools</Link>
              )}
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">Sign in</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2 py-2 hover:bg-[var(--color-surface-subtle)]">Create account</Link>
            </>
          )}
        </nav>
      </Drawer>
    </header>
  );
}
