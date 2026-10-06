import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Intentionally no backend logging — client recovery only.
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="main" className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Something went wrong on our side.</h1>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Try again, or browse tools.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              className="rounded bg-[var(--color-primary)] px-4 py-2 text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <a
              href="/tools"
              className="rounded border border-[var(--color-border)] px-4 py-2"
            >
              Browse tools
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
