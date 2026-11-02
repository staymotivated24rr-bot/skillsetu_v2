import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { answerSchema } from '@/lib/diagnostic/engine';
import { defaultDraftPreview } from '@/lib/diagnostic/starter-v3/bank';
import {
  enter,
  getRun,
  respond,
  saveInteraction,
  sessionFor,
  SESSION_COOKIE,
  startRun,
} from '@/lib/diagnostic/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const id = z.string().min(1).max(100);
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('leave') }).strict(),
  z.object({ action: z.literal('enter'), name: z.string().trim().min(1).max(40) }).strict(),
  z
    .object({
      action: z.literal('start'),
      restart: z.boolean().optional(),
      restartFrom: id.optional(),
      mode: z.enum(['independent', 'prior-informed']).optional(),
      preview: z.boolean().optional(),
    })
    .strict(),
  z
    .object({ action: z.literal('answer'), runId: id, questionId: id, answer: answerSchema })
    .strict(),
  z
    .object({ action: z.literal('draft'), runId: id, questionId: id, answer: answerSchema })
    .strict(),
  z.object({ action: z.literal('hint'), runId: id, questionId: id }).strict(),
]);
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
function failure(e: unknown) {
  if (e instanceof AppError) return json({ error: e.message }, e.status);
  if (e instanceof z.ZodError || e instanceof SyntaxError)
    return json({ error: 'Please check the answer format.' }, 400);
  console.error('Diagnostic request failed', e instanceof Error ? e.name : 'Unknown error');
  return json(
    {
      error: 'Could not save this request. Your submitted answers are preserved; retry or resume.',
    },
    500,
  );
}
function enabled() {
  if (process.env.DIAGNOSTIC_V2_ENABLED !== 'true')
    throw new AppError('Diagnostic pilot is not enabled.', 404);
}
export async function GET(req: NextRequest) {
  try {
    enabled();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return json({ session: false, run: null });
    const session = await sessionFor(token);
    return json({
      session: true,
      run: await getRun(
        session.id,
        req.nextUrl.searchParams.get('run') ?? undefined,
        req.nextUrl.searchParams.has('preview')
          ? req.nextUrl.searchParams.get('preview') === 'starter-v3'
          : defaultDraftPreview(),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    enabled();
    const origin = req.headers.get('origin');
    let originUrl: URL | null = null;
    try {
      originUrl = origin ? new URL(origin) : null;
    } catch {
      /* Reject malformed origins below. */
    }
    // Next may construct nextUrl with its internal bind hostname. Compare to the
    // incoming public Host, never to arbitrary forwarded-host headers.
    if (
      !originUrl ||
      !['http:', 'https:'].includes(originUrl.protocol) ||
      origin !== originUrl.origin ||
      originUrl.host !== req.headers.get('host') ||
      req.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new AppError('Submit from the SkillSetu application.', 403);
    if (!req.headers.get('content-type')?.startsWith('application/json'))
      throw new AppError('Send a JSON request.', 415);
    // Bound the stream itself, including requests without a trustworthy Content-Length.
    const reader = req.body?.getReader();
    if (!reader) throw new AppError('Missing request.', 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.length;
        if (bytes > 8192) {
          await reader.cancel();
          throw new AppError('Request is too large.', 413);
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = input.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (body.action === 'leave') {
      const response = json({ session: false });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    if (body.action === 'enter') {
      if (token) {
        await sessionFor(token);
        return json({ session: true });
      }
      const nextToken = await enter(body.name),
        response = json({ session: true });
      response.cookies.set(SESSION_COOKIE, nextToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 30 * 86400,
      });
      return response;
    }
    const session = await sessionFor(token);
    if (body.action === 'start')
      return json({
        run: await startRun(
          session.id,
          body.restart,
          body.mode,
          body.restartFrom,
          body.preview ?? defaultDraftPreview(),
        ),
      });
    if (body.action === 'answer')
      return json({ run: await respond(session.id, body.runId, body.questionId, body.answer) });
    return json({
      run: await saveInteraction(
        session.id,
        body.runId,
        body.questionId,
        body.action,
        body.action === 'draft' ? body.answer : undefined,
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
