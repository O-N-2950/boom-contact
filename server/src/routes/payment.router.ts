import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, TRPCError } from './trpc.js';
import { createCheckoutSession, getUserCredits, saveConsent, useCredit, PACKAGES, SUPPORTED_CURRENCIES, COUNTRY_TO_CURRENCY, getPrice, formatPrice } from '../services/stripe.service.js';
import { paymentCreateCheckoutOutput } from './output-schemas.js';

export const paymentRouter = router({
  // Retourner les packages disponibles
  packages: publicProcedure
    .query(() => Object.values(PACKAGES)),

  // Créer une session Stripe Checkout
  createCheckout: publicProcedure
    .input(z.object({
      packageId:        z.enum(['single', 'pack3', 'pack10']),
      userEmail:        z.string().email().max(320),
      currency:         z.enum(['CHF','EUR','GBP','AUD','USD','CAD','SGD','JPY']).default('EUR'),
      locale:           z.string().max(10).default('fr'),
      countryCode:      z.string().max(10).optional(),
      constatSessionId: z.string().max(50).optional(), // pour retour direct après paiement one-shot
    }))
    .output(paymentCreateCheckoutOutput)
    .mutation(async ({ input }) => {
      return createCheckoutSession(
        input.packageId,
        input.userEmail,
        input.currency,
        input.locale,
        input.constatSessionId,
      );
    }),

  // GET payment.currencies — return full pricing grid
  currencies: publicProcedure
    .query(() => {
      const grid: Record<string, any> = {};
      for (const pkgId of ['single','pack3','pack10'] as const) {
        grid[pkgId] = {};
        for (const cur of SUPPORTED_CURRENCIES) {
          grid[pkgId][cur] = {
            amountCents: getPrice(pkgId, cur),
            formatted: formatPrice(getPrice(pkgId, cur), cur),
          };
        }
      }
      return { packages: grid, currencies: SUPPORTED_CURRENCIES, countryMap: COUNTRY_TO_CURRENCY };
    }),

  // Vérifier le solde de crédits (auth requise)
  credits: protectedProcedure
    .query(async ({ ctx }) => {
      const credits = await getUserCredits(ctx.authUser.email);
      return { credits };
    }),

  // Utiliser 1 crédit pour démarrer un constat — auth required to prevent IDOR
  useCredit: protectedProcedure
    .input(z.object({ sessionId: z.string().max(50) }))
    .mutation(async ({ ctx, input }) => {
      const ok = await useCredit(ctx.authUser.email, input.sessionId);
      if (!ok) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Crédits insuffisants' });
      return { ok: true };
    }),
});

export const userRouter = router({
  saveConsent: protectedProcedure
    .input(z.object({
      consentCGU:        z.boolean(),
      consentMarketing:  z.boolean(),
      country:           z.string().max(100).optional(),
      language:          z.string().max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await saveConsent(
        ctx.authUser.email,
        input.consentCGU,
        input.consentMarketing,
        input.country,
        input.language,
      );
      return { ok: true };
    }),
});
