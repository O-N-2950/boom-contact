import { z } from 'zod';
import { router, protectedProcedure } from './trpc.js';
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

});
