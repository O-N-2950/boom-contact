import { pgTable, text, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  status:       varchar('status', { length: 20 }).notNull().default('waiting'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  expiresAt:    timestamp('expires_at').notNull(),
  accident:     jsonb('accident').notNull().default({}),
  participantA: jsonb('participant_a').notNull().default({}),
  participantB: jsonb('participant_b'),
  pdfUrl:       text('pdf_url'),
});
