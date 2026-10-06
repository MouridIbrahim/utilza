import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { normalizeError } from '../lib/api-client.js';
import { queryClient, queryKeys } from '../app/query-client.js';
import { useSessionStore } from '../stores/session.js';
import { clearHistory, getHistory } from '../services/history-service.js';
import { getSubscription } from '../services/subscription-service.js';
import { deleteUserMe, getUserMe, updateUserMe } from '../services/users-service.js';
import { logout } from '../services/auth-service.js';
import { useToastStore } from '../components/feedback/ToastRegion.jsx';

export function useHistoryQuery({ page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: queryKeys.history({ page, limit }),
    queryFn: async ({ signal }) => {
      try {
        return await getHistory({ page, limit }, signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    placeholderData: keepPreviousData,
    retry: 0,
  });
}

export function useClearHistory() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: async () => {
      try {
        return await clearHistory();
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] });
      toast({ tone: 'success', message: 'History cleared.' });
    },
    onError: (err) => {
      toast({ tone: 'error', message: err?.message || 'Could not clear history.' });
    },
  });
}

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async ({ signal }) => {
      try {
        return await getSubscription(signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    staleTime: 60_000,
    retry: 0,
  });
}

export function useProfileQuery() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async ({ signal }) => {
      try {
        return await getUserMe(signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    staleTime: 60_000,
    retry: 0,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: async ({ name }) => {
      try {
        return await updateUserMe({ name });
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (user) => {
      qc.setQueryData(['profile'], user);
      qc.setQueryData(queryKeys.me, user);
      useSessionStore.getState().setUser(user);
      qc.invalidateQueries({ queryKey: queryKeys.me });
      toast({ tone: 'success', message: 'Profile updated.' });
    },
    onError: (err) => {
      toast({ tone: 'error', message: err?.message || 'Could not update profile.' });
    },
  });
}

export function useDeleteAccount() {
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: async () => {
      try {
        return await deleteUserMe();
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: async () => {
      try {
        await logout();
      } finally {
        useSessionStore.getState().clearSession();
        queryClient.removeQueries();
        toast({ tone: 'success', message: 'Your account has been deleted.' });
        navigate('/', { replace: true });
      }
    },
    onError: (err) => {
      toast({ tone: 'error', message: err?.message || 'Could not delete account.' });
    },
  });
}
