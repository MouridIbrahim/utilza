import { Outlet } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader.jsx';
import { Footer } from './Footer.jsx';
import { SearchPalette } from '../../features/search/components/SearchPalette.jsx';

export function AppShell({ aside }) {
  return (
    <div className="flex min-h-screen flex-col">
      <GlobalHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        {aside && (
          <aside aria-label="Section navigation" className="lg:w-56 lg:shrink-0">
            <div className="lg:sticky lg:top-20">{aside}</div>
          </aside>
        )}
        <main id="main" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <Footer />
      <SearchPalette />
    </div>
  );
}
