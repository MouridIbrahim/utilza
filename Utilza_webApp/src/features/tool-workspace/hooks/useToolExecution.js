import { useMutation } from '@tanstack/react-query';
import { executeTool } from '../../../services/tool-service.js';

// Mutations only — results expire (~1h) and have no list API, so nothing
// here is cached beyond the current result session.
export function useToolExecution() {
  return useMutation({
    mutationFn: ({ def, files, params, signal }) =>
      executeTool({ endpoint: def.endpoint, files, params, signal }),
    retry: 0,
  });
}
