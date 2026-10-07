import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './query-client.js';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary.jsx';
import { ToastRegion } from '../components/feedback/ToastRegion.jsx';
import { ThemeEffect } from '../stores/theme.js';

export function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <ThemeEffect />
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:px-3 focus:py-2"
          >
            Skip to main content
          </a>
          {children}
          <ToastRegion />
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
