import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, TRPCError, checkIdempotency, storeIdempotency } from './trpc.js';
import { createCheckoutSession, getUserCredits, saveConsent, useCredit, PACKAGES, SUPPORTED_CURRENCIES, COUNTRY_TO_CURRENCY, getPrice, formatPrice } from '../services/stripe.service.js';
import { paymentCreateCheckoutOutput, paymentPackagesOutput, paymentCurrenciesOutput, paymentCreditsOutput, paymentUseCreditOutput, paymentVerifyCreditOutput, userSaveConsentOutput } from './output-schemas.js';
import { logAudit } from '../services/audit.service.js';

export const paymentRouter = router({
  // Retourner les packages disponibles
  packages: publicProcedure
    .output(paymentPackagesOutput)
    .query(() => Object.values(PACKAGES)),

  // Créer une session Stripe Checkout
  createCheckout: publicProcedure
    .input(z.object({
      packageId:        z.enum(['single', 'pack3', 'pack10']),
      userEmail: z.string().trim().email().max(320),
      currency:         z.enum(['CHF','EUR','GBP','AUD','USD','CAD','SGD','JPY']).default('EUR'),
      locale: z.string().trim().max(10).default('fr'),
      countryCode: z.string().trim().max(10).optional(),
      constatSessionId: z.string().trim().max(50).optional(), // pour retour direct après paiement one-shot
      idempotencyKey: z.string().trim().max(100).optional(),
    }))
    .output(paymentCreateCheckoutOutput)
    .mutation(async ({ input }) => {
      const cached = checkIdempotency(input.idempotencyKey);
      if (cached) return cached as typeof paymentCreateCheckoutOutput._output;

      const result = await createCheckoutSession(
        input.packageId,
        input.userEmail,
        input.currency,
        input.locale,
        input.constatSessionId,
      );
      storeIdempotency(input.idempotencyKey, result);
      logAudit({ event: 'credit.purchase', detail: { email: input.userEmail, packageId: input.packageId, currency: input.currency } });
      return result;
    }),

  // GET payment.currencies — return full pricing grid
  currencies: publicProcedure
    .output(paymentCurrenciesOutput)
    .query((() => {
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
    }) as any),

  // Vérifier le solde de crédits (auth requise)
  credits: protectedProcedure
    .output(paymentCreditsOutput)
    .query(async ({ ctx }) => {
      const credits = await getUserCredits(ctx.authUser.email);
      return { credits };
    }),

  // Vérifier si les crédits sont prêts après paiement (polling pour one-shot flow)
  verifyCredit: publicProcedure
    .input(z.object({ userEmail: z.string().trim().email().max(320), sessionId: z.string().trim().max(50).optional() }))
    .output(paymentVerifyCreditOutput)
    .query(async ({ input }) => {
      const credits = await getUserCredits(input.userEmail);
      return { ready: credits > 0, credits };
    }),

  // Utiliser 1 crédit pour démarrer un constat — auth required to prevent IDOR
  useCredit: protectedProcedure
    .input(z.object({ sessionId: z.string().trim().max(50), idempotencyKey: z.string().trim().max(100).optional() }))
    .output(paymentUseCreditOutput)
    .mutation(async ({ ctx, input }) => {
      const cached = checkIdempotency(input.idempotencyKey);
      if (cached) return cached as typeof paymentUseCreditOutput._output;

      const ok = await useCredit(ctx.authUser.email, input.sessionId);
      if (!ok) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Crédits insuffisants' });
      const result = { ok: true };
      storeIdempotency(input.idempotencyKey, result);
      return result;
    }),
});

export const userRouter = router({
  saveConsent: publicProcedure
    .input(z.object({
      email:             z.string().email().max(254),
      consentCGU:        z.boolean(),
      consentMarketing:  z.boolean(),
      country: z.string().trim().max(100).optional(),
      language:          z.string().max(10).optional(),
    }))
    .output(userSaveConsentOutput)
    .mutation(async ({ ctx, input }) => {
      const email = ctx.authUser?.email ?? input.email;
      await saveConsent(
        email,
        input.consentCGU,
        input.consentMarketing,
        input.country,
        input.language,
      );
      return { ok: true };
    }),
});
