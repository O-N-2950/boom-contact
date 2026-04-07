import { z } from 'zod';
import { router, protectedProcedure } from './trpc.js';

export const vehicleRouter = router({

  // GET vehicle.list
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { listVehicles } = await import('../services/vehicle.service.js');
      return listVehicles(ctx.authUser.sub);
    }),

  // POST vehicle.save — create or update
  save: protectedProcedure
    .input(z.object({
      id:           z.string().optional(),
      nickname:     z.string().optional(),
      plate:        z.string().optional(),
      make:         z.string().optional(),
      model:        z.string().optional(),
      color:        z.string().optional(),
      year:         z.string().optional(),
      category:     z.string().optional(),
      licenseData:  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      insuranceData:z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { saveVehicle } = await import('../services/vehicle.service.js');
      return saveVehicle(ctx.authUser.sub, input);
    }),

  // POST vehicle.delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteVehicle } = await import('../services/vehicle.service.js');
      return deleteVehicle(ctx.authUser.sub, input.id);
    }),

});
