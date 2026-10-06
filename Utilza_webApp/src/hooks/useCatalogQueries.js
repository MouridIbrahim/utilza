import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { normalizeError } from '../lib/api-client.js';
import { queryKeys } from '../app/query-client.js';
import {
  getCategories,
  getCategory,
  getTool,
  getTools,
} from '../services/catalog-service.js';

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async ({ signal }) => {
      try {
        return await getCategories(signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
  });
}

export function useCategoryQuery(slug) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async ({ signal }) => {
      try {
        return await getCategory(slug, signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    enabled: !!slug,
    retry: 0,
  });
}

export function useToolsQuery({ category, search, page = 1, limit = 20 }) {
  return useQuery({
    queryKey: queryKeys.tools({ category: category || '', search: search || '', page, limit }),
    queryFn: async ({ signal }) => {
      try {
        const params = { page, limit };
        if (category) params.category = category;
        if (search) params.search = search;
        return await getTools(params, signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    placeholderData: keepPreviousData,
  });
}

export function useToolQuery(slug) {
  return useQuery({
    queryKey: queryKeys.tool(slug),
    queryFn: async ({ signal }) => {
      try {
        return await getTool(slug, signal);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    enabled: !!slug,
    retry: 0,
  });
}
