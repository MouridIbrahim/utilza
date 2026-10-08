import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { Button3D } from './Button3D.jsx';

// Large hero search: icon, clear input, ⌘K hint, submit → catalog search.
export function SearchBar({ initialValue = '', autoFocus, large }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue || '');

  function submit(e) {
    e.preventDefault();
    const q = value.trim().slice(0, 100);
    navigate(q ? `/tools?search=${encodeURIComponent(q)}` : '/tools');
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      aria-label="Search tools"
      className={`card-3d flex items-center gap-2 p-2 pl-4 ${large ? 'w-full max-w-xl' : 'w-full max-w-md'}`}
      style={{ borderRadius: 999 }}
    >
      <SearchIcon size={20} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
      <label htmlFor="hero-search" className="sr-only">Search tools</label>
      <input
        id="hero-search"
        type="search"
        value={value}
        autoFocus={autoFocus}
        maxLength={100}
        placeholder="Search tools… (try “pdf” or “image”)"
        onChange={(e) => setValue(e.target.value)}
        className="w-full bg-transparent text-base outline-none placeholder:text-[var(--color-text-muted)]"
      />
      <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-muted)] sm:block">
        ⌘K
      </kbd>
      <Button3D type="submit" size="md" className="rounded-full!">
        Search
      </Button3D>
    </form>
  );
}
