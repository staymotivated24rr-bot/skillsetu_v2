import { NextResponse } from 'next/server';
import { db, configuredDatabaseUrl, deploymentDatabaseIssue } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let issue =
    deploymentDatabaseIssue() ??
    (!configuredDatabaseUrl() ? 'Configure the application database before starting.' : null);
  if (!issue) {
    try {
      await db.assessmentBank.findFirst({ select: { id: true } });
    } catch {
      issue = 'Database connection or migrations are unavailable. Run the trusted setup and retry.';
    }
  }
  return NextResponse.json(
    {
      ok: !issue,
      database: configuredDatabaseUrl() ? 'hosted-postgresql' : 'unconfigured',
      ...(issue ? { issue } : {}),
    },
    {
      status: issue ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
