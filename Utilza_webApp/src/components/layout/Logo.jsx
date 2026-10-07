import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';

export function Logo({ compact }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Utilza home">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white shadow-[var(--shadow-card)]"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
      >
        <Wrench size={18} strokeWidth={2.5} />
      </span>
      {!compact && <span className="text-lg font-extrabold tracking-tight">Utilza</span>}
    </Link>
  );
}
