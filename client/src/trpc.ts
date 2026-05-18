import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/routes/router';
import { getApiBase } from './apiBase';

// tRPC React hooks (pour les composants avec React Query)
export const trpc = createTRPCReact<AppRouter>();

// tRPC vanilla client (pour les appels hors composant / utilitaires)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getApiBase()}/trpc`,
      headers: () => ({ 'X-Requested-With': 'trpc-client' }),
    }),
  ],
});
