import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/session.js';
import { probeAdminAccess } from '../services/admin-service.js';
import { normalizeError } from '../lib/api-client.js';
import { Skeleton } from '../components/feedback/Skeleton.jsx';

// Admin gate: token alone proves nothing (no role in auth payload).
// Probe an admin endpoint; success -> render, 403 -> 403 page, 401 -> login.
export function AdminGate() {
  const location = useLocation();
  const { token, clearSession, setAdmin, resetAdmin } = useSessionStore();

  const probe = useQuery({
    queryKey: ['adminProbe'],
    queryFn: async ({ signal }) => {
      try {
        await probeAdminAccess(signal);
        return { allowed: true };
      } catch (err) {
        throw normalizeError(err);
      }
    },
    enabled: !!token,
    staleTime: 60_000,
    retry: 0,
  });

  useEffect(() => {
    if (probe.data?.allowed) setAdmin({ isAdmin: true });
    if (probe.isError && probe.error?.status === 403) resetAdmin();
    if (probe.isError && probe.error?.status === 401) clearSession();
  }, [probe.data, probe.isError, probe.error, setAdmin, resetAdmin, clearSession]);

  if (!token) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (probe.isLoading) {
    return (
      <div aria-label="Checking admin access" className="flex flex-col gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (probe.isError && probe.error?.status === 401) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (probe.isError && probe.error?.status === 403) {
    return <Navigate to="/403" replace />;
  }

  if (probe.isError) {
    return <Navigate to="/500" replace />;
  }

  return <Outlet />;
}
