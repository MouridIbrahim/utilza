import { Zap, Lock, Wrench } from 'lucide-react';
import { Logo } from '../components/layout/Logo.jsx';

// Split auth layout: brand panel (desktop) + form. No invented links —
// only real routes and verifiable claims. No forgot-password (no backend
// endpoint), no social login (unsupported).
export function AuthLayout({ title, description, children }) {
  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
      <div
        className="hero-backdrop hidden flex-col justify-between gap-8 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 md:flex"
        aria-label="About Utilza"
      >
        <Logo />
        <div>
          <p className="text-display" style={{ fontSize: '2rem' }}>
            Powerful tools.
            <br />
            One simple workspace.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            {[
              { icon: Wrench, text: '80+ file, PDF, image and everyday tools' },
              { icon: Zap, text: 'Fast processing with instant downloads' },
              { icon: Lock, text: 'Private by design — results expire in about an hour' },
            ].map((b) => (
              <li key={b.text} className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-[10px] text-white"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary-top), var(--color-primary-bottom))' }}
                >
                  <b.icon size={15} />
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px] text-[var(--color-text-muted)]">Everyday tools, all in one place.</p>
      </div>
      <div className="flex flex-col justify-center gap-4">
        <div>
          <h1 className="text-page-title">{title}</h1>
          <p className="mt-1 text-[15px] text-[var(--color-text-muted)]">{description}</p>
        </div>
        <div className="card-3d p-6">{children}</div>
      </div>
    </div>
  );
}
