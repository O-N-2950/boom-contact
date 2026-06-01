import { z } from 'zod';
import { router, protectedProcedure, TRPCError } from './trpc.js';
import { vehicleListOutput, vehicleSaveOutput, vehicleDeleteOutput } from './output-schemas.js';

export const vehicleRouter = router({

  // GET vehicle.list
  list: protectedProcedure
    .output(vehicleListOutput)
    .query(async ({ ctx }) => {
      const { listVehicles } = await import('../services/vehicle.service.js');
      return listVehicles(ctx.authUser.sub);
    }),

  // POST vehicle.save — create or update
  save: protectedProcedure
    .input(z.object({
      id:           z.string().trim().max(100).optional(),
      nickname:     z.string().trim().max(200).optional(),
      plate:        z.string().trim().max(50).optional(),
      make:         z.string().trim().max(100).optional(),
      model:        z.string().trim().max(100).optional(),
      color:        z.string().trim().max(50).optional(),
      year:         z.string().trim().max(10).optional(),
      category:     z.string().trim().max(100).optional(),
      licenseData:  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      insuranceData:z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    }))
    .output(vehicleSaveOutput)
    .mutation((async ({ ctx, input }: any) => {
      const { saveVehicle } = await import('../services/vehicle.service.js');
      return saveVehicle(ctx.authUser.sub, input);
    }) as any),

  // POST vehicle.delete
  delete: protectedProcedure
    .input(z.object({ id: z.string().trim().max(100) }))
    .output(vehicleDeleteOutput)
    .mutation(async ({ ctx, input }) => {
      const { deleteVehicle } = await import('../services/vehicle.service.js');
      return deleteVehicle(ctx.authUser.sub, input.id);
    }),

  // ── Fleet B2B — Value Chain (additif) ──────────────────────
  // Garage unifié : véhicules personnels + véhicules d'organisation accessibles.
  listAccessible: protectedProcedure
    .query(async ({ ctx }) => {
      const { listAccessibleVehicles } = await import('../services/vehicle.service.js');
      return listAccessibleVehicles(ctx.authUser.sub);
    }),

  // Crée/édite un véhicule d'organisation (owner/fleet_admin uniquement)
  saveOrganization: protectedProcedure
    .input(z.object({
      organizationId: z.string().trim().max(20),
      id:           z.string().trim().max(100).optional(),
      nickname:     z.string().trim().max(200).optional(),
      plate:        z.string().trim().max(50).optional(),
      make:         z.string().trim().max(100).optional(),
      model:        z.string().trim().max(100).optional(),
      color:        z.string().trim().max(50).optional(),
      year:         z.string().trim().max(10).optional(),
      category:     z.string().trim().max(100).optional(),
      licenseData:  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      insuranceData:z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    }))
    .mutation((async ({ ctx, input }: any) => {
      const { saveOrganizationVehicle } = await import('../services/vehicle.service.js');
      const { organizationId, ...rest } = input;
      try { return await saveOrganizationVehicle(ctx.authUser.sub, organizationId, rest); }
      catch (e) { return mapVehicleError(e); }
    }) as any),

  deleteOrganization: protectedProcedure
    .input(z.object({ id: z.string().trim().max(100) }))
    .mutation(async ({ ctx, input }) => {
      const { deleteOrganizationVehicle } = await import('../services/vehicle.service.js');
      try { return await deleteOrganizationVehicle(ctx.authUser.sub, input.id); }
      catch (e) { return mapVehicleError(e); }
    }),

});

function mapVehicleError(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.startsWith('FORBIDDEN')) throw new TRPCError({ code: 'FORBIDDEN', message: msg.replace(/^FORBIDDEN:\s*/, '') || 'Accès refusé.' });
  if (msg.startsWith('NOT_FOUND')) throw new TRPCError({ code: 'NOT_FOUND', message: msg.replace(/^NOT_FOUND:\s*/, '') || 'Introuvable.' });
  if (msg.startsWith('CONFLICT'))  throw new TRPCError({ code: 'CONFLICT',  message: msg.replace(/^CONFLICT:\s*/, '')  || 'Conflit.' });
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erreur interne.' });
}
