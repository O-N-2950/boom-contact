import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/routes/router';

// tRPC React hooks (pour les composants avec React Query)
export const trpc = createTRPCReact<AppRouter>();

// tRPC vanilla client (pour les appels hors composant / utilityaires)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({ url: '/trpc' }),
  ],
});
