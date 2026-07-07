/**
 * Singleton TanStack QueryClient.
 *
 * Extracted from _layout.tsx so the AuthProvider can access it
 * for user-scoped cache clearing on logout / user change.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      // Mutations must NOT retry automatically — avoids duplicate commerce operations.
      retry: 0,
    },
  },
});
