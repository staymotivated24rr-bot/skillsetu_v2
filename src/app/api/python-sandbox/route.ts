import { NextRequest, NextResponse } from 'next/server';
import { sandboxDocument } from '@/lib/authentic/sandbox-document';
export const runtime = 'nodejs';
export function GET(req: NextRequest) {
  // Return inert document text; the client mounts it in sandbox="allow-scripts" without same-origin.
  return new NextResponse(
    sandboxDocument(
      new URL(`${req.nextUrl.protocol}//${req.headers.get('host') ?? req.nextUrl.host}`).origin,
    ),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
