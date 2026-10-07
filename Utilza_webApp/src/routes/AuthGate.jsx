import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/session.js';
import { getMe } from '../services/auth-service.js';
import { normalizeError } from '../lib/api-client.js';
import { queryKeys } from '../app/query-client.js';
import { Skeleton } from '../components/feedback/Skeleton.jsx';

function safeReturnTo(value) {
  if (typeof value !== 'string') return '/app/home';
  if (!value.startsWith('/') || value.startsWith('//')) return '/app/home';
  if (value.startsWith('/login') || value.startsWith('/register')) return '/app/home';
  return value;
}

// Bearer guard: brief skeleton -> render or login redirect. No admin logic here.
export function AuthGate() {
  const location = useLocation();
  const { token, user, clearSession } = useSessionStore();

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => {
      try {
        const data = await getMe(signal);
        return data?.user || data;
      } catch (err) {
        throw normalizeError(err);
      }
    },
    enabled: !!token,
    staleTime: 60_000,
    retry: 0,
  });

  useEffect(() => {
    if (meQuery.data) {
      useSessionStore.getState().setUser(meQuery.data);
    }
    if (meQuery.isError && meQuery.error?.status === 401) {
      clearSession();
    }
  }, [meQuery.data, meQuery.isError, meQuery.error, clearSession]);

  if (!token) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(safeReturnTo(location.pathname + location.search))}`}
        replace
      />
    );
  }

  if (meQuery.isLoading && !user) {
    return (
      <div aria-label="Checking session" className="flex flex-col gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (meQuery.isError && meQuery.error?.status === 401) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(safeReturnTo(location.pathname + location.search))}`}
        replace
      />
    );
  }

  return <Outlet />;
}

// Public-only guard: authed users bounce to home (or safe returnTo).
export function PublicOnlyGate() {
  const { token } = useSessionStore();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const returnTo = safeReturnTo(params.get('returnTo') || '/app/home');
  if (token) return <Navigate to={returnTo} replace />;
  return <Outlet />;
}
