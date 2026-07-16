import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (err) {
    console.error('[health] db', err);
  }

  return NextResponse.json(
    {
      ok: dbOk,
      db: dbOk,
      service: 'citebase',
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  );
}
