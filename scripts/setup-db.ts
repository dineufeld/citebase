/**
 * Apply drizzle/0000_init.sql against DATABASE_URL.
 * Run: npm run db:setup
 */
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import postgres from 'postgres';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const sqlFile = path.join(process.cwd(), 'drizzle', '0000_init.sql');
  const body = readFileSync(sqlFile, 'utf8');
  const client = postgres(url, { max: 1, prepare: false });

  try {
    // Enable extension first (needs superuser / allowed role — works on local docker)
    await client.unsafe(body);
    console.log('db:setup OK — schema applied');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
