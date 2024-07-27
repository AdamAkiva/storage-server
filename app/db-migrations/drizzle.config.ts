import type { Config } from 'drizzle-kit';

/**********************************************************************************/

// See: https://orm.drizzle.team/kit-docs/config-reference
export default {
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL!,
  },
  verbose: true,
  strict: true,
  schema: './src/db/schemas.ts',
  out: './db-migrations',
} satisfies Config;
