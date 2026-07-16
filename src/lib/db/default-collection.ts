import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { collections } from '@/lib/db/schema';

/** Fixed seed id from drizzle/0000_init.sql — used when present. */
export const DEFAULT_COLLECTION_ID = '00000000-0000-4000-8000-000000000001';

export async function ensureDefaultCollection(): Promise<string> {
  const existing = await db.select().from(collections).limit(1);
  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(collections)
    .values({
      id: DEFAULT_COLLECTION_ID,
      name: 'Default workspace',
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created.id;

  const again = await db
    .select()
    .from(collections)
    .where(eq(collections.id, DEFAULT_COLLECTION_ID))
    .limit(1);
  if (again[0]) return again[0].id;

  const [fallback] = await db
    .insert(collections)
    .values({ name: 'Default workspace' })
    .returning();
  return fallback.id;
}
