import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeError } from '../lib/api-client.js';
import { queryKeys } from '../app/query-client.js';
import { useSessionStore } from '../stores/session.js';
import { addFavorite, getFavorites, removeFavorite } from '../services/favorites-service.js';
import { useToastStore } from '../components/feedback/ToastRegion.jsx';

export function useFavoritesQuery() {
  const { token } = useSessionStore();
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: async ({ signal }) => {
      try {
        return await getFavorites(signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    enabled: !!token,
    staleTime: 60_000,
    retry: 0,
  });
}

export function isFavorited(favoritesData, toolId) {
  const items = favoritesData?.items || [];
  return items.some((f) => f.toolId === toolId || f.tool?.id === toolId);
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.push);

  return useMutation({
    mutationFn: async ({ toolId, favorited }) => {
      try {
        if (favorited) return await removeFavorite(toolId);
        return await addFavorite(toolId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onMutate: async ({ toolId, favorited }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites });
      const previous = queryClient.getQueryData(queryKeys.favorites);
      queryClient.setQueryData(queryKeys.favorites, (old) => {
        const items = old?.items || [];
        if (favorited) return { ...old, items: items.filter((f) => f.toolId !== toolId) };
        if (items.some((f) => f.toolId === toolId)) return old;
        return { ...old, items: [...items, { toolId, tool: { id: toolId } }] };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.favorites, context.previous);
      }
      if (err?.code === 'ALREADY_FAVORITED') {
        queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
        return;
      }
      toast({ tone: 'error', message: err?.message || 'Could not update favorite.' });
    },
    onSuccess: (_data, { favorited }) => {
      toast({
        tone: 'success',
        message: favorited ? 'Removed from favorites.' : 'Saved to favorites.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}
