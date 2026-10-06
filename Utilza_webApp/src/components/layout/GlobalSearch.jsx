import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function GlobalSearch({ autoFocus }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  function submit(e) {
    e.preventDefault();
    const q = value.trim().slice(0, 100);
    navigate(q ? `/tools?search=${encodeURIComponent(q)}` : '/tools');
  }

  return (
    <form role="search" onSubmit={submit} className="flex w-full max-w-md gap-2">
      <label htmlFor="global-search" className="sr-only">
        Search tools
      </label>
      <input
        id="global-search"
        type="search"
        value={value}
        autoFocus={autoFocus}
        maxLength={100}
        placeholder="Search tools…"
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
      >
        Search
      </button>
    </form>
  );
}
