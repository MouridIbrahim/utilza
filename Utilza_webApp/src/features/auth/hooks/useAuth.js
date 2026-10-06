import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { normalizeError } from '../../../lib/api-client.js';
import { queryClient, queryKeys } from '../../../app/query-client.js';
import { useSessionStore } from '../../../stores/session.js';
import { login as loginRequest, logout as logoutRequest, register as registerRequest } from '../../../services/auth-service.js';
import { useToastStore } from '../../../components/feedback/ToastRegion.jsx';

export function safeReturnTo(value, fallback = '/app/home') {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.startsWith('/login') || value.startsWith('/register')) return fallback;
  return value;
}

// Session-expired: clear once, toast once, redirect with preserved path.
// Only call for PROTECTED requests — public tool failures must not bounce.
export function sessionExpired(returnTo) {
  const { clearSession } = useSessionStore.getState();
  clearSession();
  queryClient.removeQueries();
  queryClient.setQueryData(queryKeys.me, null);
  useToastStore.getState().push({
    tone: 'info',
    message: 'Your session has ended. Sign in again.',
  });
  const safe = safeReturnTo(returnTo, '/app/home');
  window.location.assign(`/login?returnTo=${encodeURIComponent(safe)}`);
}

export function useLoginMutation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (values) => {
      try {
        return await loginRequest(values);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: async (data) => {
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      useSessionStore.getState().setSession({ token: data.token, user: data.user });
      queryClient.setQueryData(queryKeys.me, data.user);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      navigate(safeReturnTo(returnTo), { replace: true });
    },
  });
}

export function useRegisterMutation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (values) => {
      try {
        const payload = { email: values.email, password: values.password };
        if (values.name) payload.name = values.name;
        return await registerRequest(payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: async (data) => {
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      useSessionStore.getState().setSession({ token: data.token, user: data.user });
      queryClient.setQueryData(queryKeys.me, data.user);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      navigate(safeReturnTo(returnTo), { replace: true });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.push);

  async function signOut() {
    try {
      await logoutRequest();
    } finally {
      // Always clear locally regardless of network result — stateless JWT.
      useSessionStore.getState().clearSession();
      queryClient.removeQueries();
      toast({ tone: 'info', message: 'You have been signed out.' });
      navigate('/', { replace: true });
    }
  }

  return { signOut };
}
