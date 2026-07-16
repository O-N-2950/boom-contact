import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, TRPCError, checkIdempotency, storeIdempotency } from './trpc.js';
import { createCheckoutSession, getUserCredits, saveConsent, useCredit, PACKAGES, SUPPORTED_CURRENCIES, COUNTRY_TO_CURRENCY, getPrice, formatPrice } from '../services/stripe.service.js';
import { paymentCreateCheckoutOutput, paymentPackagesOutput, paymentCurrenciesOutput, paymentCreditsOutput, paymentUseCreditOutput, paymentVerifyCreditOutput, userSaveConsentOutput, paymentCreateInvoiceOutput } from './output-schemas.js';
import { logAudit } from '../services/audit.service.js';

export const paymentRouter = router({
  // Retourner les packages disponibles
  packages: publicProcedure
    .output(paymentPackagesOutput)
    .query(() => Object.values(PACKAGES)),

  // QR-facture suisse — « payer par facture » (virement, CHF uniquement).
  // La facture PDF (QR-bill conforme) est générée et envoyée par email ;
  // les crédits sont attribués quand l'admin marque la facture payée (option A).
  createInvoice: publicProcedure
    .input(z.object({
      packageId: z.enum(['single', 'pack3', 'pack10']),
      email: z.string().trim().email().max(320),
      language: z.string().trim().max(10).default('fr'),
    }))
    .output(paymentCreateInvoiceOutput)
    .mutation(async ({ input, ctx }) => {
      const { createInvoice } = await import('../services/invoice.service.js');
      const inv = await createInvoice({
        email: input.email,
        packageId: input.packageId,
        language: input.language,
        userId: (ctx as any).authUser?.sub,
      });
      logAudit({ event: 'invoice.created', detail: { invoiceId: inv.id, packageId: input.packageId } });
      return { ok: true, invoiceId: inv.id, displayNumber: inv.displayNumber, amountCents: inv.amountCents, currency: inv.currency };
    }),

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
      // M11 — Ne pas divulguer le solde exact à un appelant public
      // (énumération par email). On renvoie seulement la disponibilité.
      const credits = await getUserCredits(input.userEmail);
      return { ready: credits > 0, credits: credits > 0 ? 1 : 0 };
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

  // ── Fleet B2B — Wallet entreprise + routage billing (additif) ──────────
  // Attache l'organisation de facturation à un constat (véhicule d'org sélectionné).
  attachConstatBilling: protectedProcedure
    .input(z.object({ sessionId: z.string().trim().max(50), organizationId: z.string().trim().max(20) }))
    .mutation(async ({ ctx, input }) => {
      const { setConstatBillingOrganization } = await import('../services/wallet.service.js');
      try { return await setConstatBillingOrganization(ctx.authUser.sub, input.sessionId, input.organizationId); }
      catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.startsWith('FORBIDDEN')) throw new TRPCError({ code: 'FORBIDDEN', message: 'Facturation entreprise non autorisée.' });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erreur interne.' });
      }
    }),

  // Consomme un crédit pour un constat en routant vers le wallet d'org ou le crédit perso.
  consumeForConstat: protectedProcedure
    .input(z.object({ sessionId: z.string().trim().max(50), idempotencyKey: z.string().trim().max(100).optional() }))
    .mutation(async ({ ctx, input }) => {
      const cached = checkIdempotency(input.idempotencyKey);
      if (cached) return cached as { ok: boolean; billingSource: 'personal' | 'organization' };
      const { consumeCreditForConstat } = await import('../services/wallet.service.js');
      const r = await consumeCreditForConstat(ctx.authUser.email, ctx.authUser.sub, input.sessionId);
      if (!r.ok && r.billingSource === 'organization') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Crédits entreprise insuffisants' });
      }
      if (!r.ok) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Crédits insuffisants' });
      const result = { ok: true, billingSource: r.billingSource };
      storeIdempotency(input.idempotencyKey, result);
      return result;
    }),

  // Solde du wallet d'organisation (membre uniquement).
  organizationWallet: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20) }))
    .query(async ({ ctx, input }) => {
      const { canUseOrganizationWallet, getOrganizationWalletBalance } = await import('../services/wallet.service.js');
      const { getUserOrganizationRole } = await import('../services/organization.service.js');
      const role = await getUserOrganizationRole(ctx.authUser.sub, input.organizationId);
      if (!role) throw new TRPCError({ code: 'FORBIDDEN', message: 'Non membre.' });
      const balance = await getOrganizationWalletBalance(input.organizationId);
      const canUse = await canUseOrganizationWallet(ctx.authUser.sub, input.organizationId);
      return { balance, canUse };
    }),

  // Soldes des wallets de toutes mes organisations (pour l'UI compte).
  myOrganizationWallets: protectedProcedure
    .query(async ({ ctx }) => {
      const { listMyOrganizations } = await import('../services/organization.service.js');
      const { getOrganizationWalletBalance, canUseOrganizationWallet, canManageOrganizationBilling } = await import('../services/wallet.service.js');
      const orgs = await listMyOrganizations(ctx.authUser.sub);
      const out: Array<{ organizationId: string; name: string; balance: number; canUse: boolean; canManageBilling: boolean }> = [];
      for (const o of orgs) {
        out.push({
          organizationId: o.id, name: o.name,
          balance: await getOrganizationWalletBalance(o.id),
          canUse: await canUseOrganizationWallet(ctx.authUser.sub, o.id),
          canManageBilling: await canManageOrganizationBilling(ctx.authUser.sub, o.id),
        });
      }
      return out;
    }),

  // Achat de crédits entreprise (owner/fleet_admin) → Stripe Checkout, crédite le wallet d'org via webhook.
  createOrgCheckout: protectedProcedure
    .input(z.object({
      organizationId: z.string().trim().max(20),
      packageId:      z.enum(['single', 'pack3', 'pack10']),
      currency:       z.enum(['CHF','EUR','GBP','AUD','USD','CAD','SGD','JPY']).default('EUR'),
      locale:         z.string().trim().max(10).default('fr'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { canManageOrganizationBilling } = await import('../services/wallet.service.js');
      if (!(await canManageOrganizationBilling(ctx.authUser.sub, input.organizationId))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Seuls les responsables de flotte peuvent acheter des crédits entreprise.' });
      }
      const { createOrgCheckout } = await import('../services/stripe.service.js');
      return createOrgCheckout(input.organizationId, input.packageId, ctx.authUser.email, ctx.authUser.sub, input.currency, input.locale);
    }),

  // ── Fleet Finance Dashboard — lecture seule (owner/fleet_admin) ──────────
  getOrganizationWallet: protectedProcedure
    .input(z.object({ organizationId: z.string().trim().max(20) }))
    .query(async ({ ctx, input }) => {
      const { getOrganizationWalletView } = await import('../services/wallet.service.js');
      try { return await getOrganizationWalletView(ctx.authUser.sub, input.organizationId); }
      catch { throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès finance non autorisé.' }); }
    }),

  listOrganizationTransactions: protectedProcedure
    .input(z.object({
      organizationId: z.string().trim().max(20),
      limit:  z.number().int().min(1).max(100).optional(),
      cursor: z.string().trim().max(40).nullish(),
      type:   z.enum(['purchase', 'consumption', 'adjustment', 'refund']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { listOrganizationTransactions } = await import('../services/wallet.service.js');
      try {
        return await listOrganizationTransactions(ctx.authUser.sub, input.organizationId, {
          limit: input.limit, cursor: input.cursor ?? null, type: input.type,
        });
      } catch { throw new TRPCError({ code: 'FORBIDDEN', message: 'Historique non autorisé.' }); }
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
