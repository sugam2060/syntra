import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schemas/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: (process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL) as string,
  },
  strict: true,
  verbose: true,
});
