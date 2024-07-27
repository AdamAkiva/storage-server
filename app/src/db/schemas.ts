import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**********************************************************************************/

export const fileModel = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  encoding: varchar('encoding').notNull(),
  mimeType: varchar('mime_type').notNull(),
  secured: boolean('secured').notNull(),
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
