import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// There was an issue with this being imported using the migrations.
// It was resolved using this solution:
// https://github.com/drizzle-team/drizzle-kit-mirror/issues/55#issuecomment-1782555333
import { VALIDATION } from '../utils/constants.js';

/**********************************************************************************/

export const fileModel = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  encoding: varchar('encoding').notNull(),
  mimeType: varchar('mime_type').notNull(),
  storageMedium: varchar('storage_medium', {
    enum: VALIDATION.ALLOWED_STORAGE_MEDIUMS,
  })
    .default('disk')
    .notNull(),
  path: varchar('path').notNull(),
  secured: boolean('secured').default(false).notNull(),
  createdAt: timestamp('created_at', {
    mode: 'string',
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'string',
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
