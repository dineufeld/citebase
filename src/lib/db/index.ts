import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set');
}

/**
 * postgres.js client. prepare:false plays nicer with Neon + transaction pooling;
 * fine for local docker too.
 */
const client = postgres(connectionString ?? 'postgresql://postgres:postgres@localhost:5433/citebase', {
  prepare: false,
  max: 10,
});

export const db = drizzle(client, { schema });
export { client as sqlClient };
