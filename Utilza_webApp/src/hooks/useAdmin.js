import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { normalizeError } from '../lib/api-client.js';
import { queryKeys } from '../app/query-client.js';
import { getAdminTools, getAdminUsers } from '../services/admin-service.js';

const SHORT_STALE = 30_000;

export function useAdminToolsQuery({ search, page = 1, limit = 50 } = {}) {
  return useQuery({
    queryKey: queryKeys.adminTools({ search: search || '', page, limit }),
    queryFn: async ({ signal }) => {
      try {
        const params = { page, limit };
        if (search) params.search = search;
        return await getAdminTools(params, signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    placeholderData: keepPreviousData,
    staleTime: SHORT_STALE,
    retry: 0,
  });
}

export function useAdminUsersQuery({ search, page = 1, limit = 50 } = {}) {
  return useQuery({
    queryKey: queryKeys.adminUsers({ search: search || '', page, limit }),
    queryFn: async ({ signal }) => {
      try {
        const params = { page, limit };
        if (search) params.search = search;
        return await getAdminUsers(params, signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    placeholderData: keepPreviousData,
    staleTime: SHORT_STALE,
    retry: 0,
  });
}
