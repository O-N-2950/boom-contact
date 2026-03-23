import crypto from 'crypto';
import { db } from '../db/index.js';
import { vehicles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../logger.js';

function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

export async function listVehicles(userId: string) {
  return db.query.vehicles.findMany({
    where: eq(vehicles.userId, userId),
    orderBy: (v, { desc }) => [desc(v.updatedAt)],
  });
}

export async function saveVehicle(userId: string, input: {
  id?: string;
  nickname?: string;
  plate?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: string;
  category?: string;
  licenseData?: Record<string, any>;
  insuranceData?: Record<string, any>;
}) {
  const now = new Date();

  if (input.id) {
    // Update — verify ownership
    const existing = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, input.id), eq(vehicles.userId, userId)),
    });
    if (!existing) throw new Error('Véhicule introuvable.');

    await db.update(vehicles)
      .set({
        nickname:     input.nickname      ?? existing.nickname,
        plate:        input.plate         ?? existing.plate,
        make:         input.make          ?? existing.make,
        model:        input.model         ?? existing.model,
        color:        input.color         ?? existing.color,
        year:         input.year          ?? existing.year,
        category:     input.category      ?? existing.category,
        licenseData:  input.licenseData   ?? existing.licenseData,
        insuranceData:input.insuranceData ?? existing.insuranceData,
        updatedAt: now,
      })
      .where(eq(vehicles.id, input.id));

    logger.info('Vehicle updated', { userId, vehicleId: input.id });
    return { ok: true, id: input.id };
  } else {
    // Create
    const id = nanoid();
    await db.insert(vehicles).values({
      id,
      userId,
      nickname:     input.nickname,
      plate:        input.plate,
      make:         input.make,
      model:        input.model,
      color:        input.color,
      year:         input.year,
      category:     input.category,
      licenseData:  input.licenseData  || {},
      insuranceData:input.insuranceData || {},
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Vehicle created', { userId, vehicleId: id, plate: input.plate });
    return { ok: true, id };
  }
}

export async function deleteVehicle(userId: string, vehicleId: string) {
  const existing = await db.query.vehicles.findFirst({
    where: and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)),
  });
  if (!existing) throw new Error('Véhicule introuvable.');

  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
  logger.info('Vehicle deleted', { userId, vehicleId });
  return { ok: true };
}
