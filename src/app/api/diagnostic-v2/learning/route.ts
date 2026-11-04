import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { enter, sessionFor, SESSION_COOKIE } from '@/lib/diagnostic/service';
import { AppError } from '@/lib/errors';
import { learningAnswerSchema } from '@/lib/learning-studio/evaluation';
import { openPythonTrace, revealPythonTrace } from '@/lib/learning-studio/trace-model';
import {
  getLearning,
  getLearningPathway,
  learningRecommendation,
  learningAction,
  startLearning,
  studioEnabled,
} from '@/lib/learning-studio/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const id = z.string().min(1).max(100);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('learning-select'), sourceRunId: id }).strict(),
  z.object({ action: z.literal('trace-open'), traceId: id }).strict(),
  z
    .object({
      action: z.literal('trace-next'),
      traceId: id,
      version: id,
      index: z.number().int().min(1).max(63),
      selected: z.number().int().min(0).max(5).optional(),
    })
    .strict(),
  z.object({ action: z.literal('leave') }).strict(),
  z.object({ action: z.literal('enter'), name: z.string().trim().min(1).max(40) }).strict(),
  z
    .object({
      action: z.literal('start'),
      restart: z.boolean().optional(),
      lessonId: id.optional(),
      sourceRunId: id.optional(),
      competencyId: id.optional(),
    })
    .strict(),
  ...(['draft', 'visit', 'hint', 'evaluate', 'submit'] as const).map((action) =>
    z
      .object({
        action: z.literal(action),
        runId: id,
        stepId: id,
        requestId: z.uuid(),
        revision: z.number().int().min(0).optional(),
        answer: learningAnswerSchema.optional(),
      })
      .strict(),
  ),
]);
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
function failure(e: unknown) {
  if (e instanceof AppError) return json({ error: e.message }, e.status);
  if (e instanceof z.ZodError || e instanceof SyntaxError)
    return json({ error: 'Check the lesson response format.' }, 422);
  console.error('Learning studio request failed', e instanceof Error ? e.name : 'Unknown error');
  return json(
    { error: 'Could not save learning progress. Reconnect and resume before retrying.' },
    500,
  );
}
function enabled() {
  if (!studioEnabled()) throw new AppError('Development lesson is disabled.', 404);
}
export async function GET(req: NextRequest) {
  try {
    enabled();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) {
      if (req.nextUrl.searchParams.has('source') || req.nextUrl.searchParams.has('recommendation'))
        throw new AppError(
          'Use the original diagnostic browser session to open this pathway.',
          401,
        );
      return json({ session: false, run: null });
    }
    const session = await sessionFor(token);
    const recommendationSource = req.nextUrl.searchParams.get('recommendation');
    if (recommendationSource)
      return json(
        await learningRecommendation(
          session.id,
          id.parse(recommendationSource),
          false,
          req.nextUrl.searchParams.has('decision')
            ? id.parse(req.nextUrl.searchParams.get('decision'))
            : undefined,
        ),
      );
    const sourceRunId = req.nextUrl.searchParams.get('source');
    if (sourceRunId)
      return json({ pathway: await getLearningPathway(session.id, id.parse(sourceRunId)) });
    const runId = req.nextUrl.searchParams.get('run') ?? undefined;
    if (runId) id.parse(runId);
    const lessonId = req.nextUrl.searchParams.get('lesson') ?? undefined;
    if (lessonId) id.parse(lessonId);
    return json({ session: true, run: await getLearning(session.id, runId, lessonId) });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    enabled();
    const origin = req.headers.get('origin');
    let parsed: URL | null = null;
    try {
      parsed = origin ? new URL(origin) : null;
    } catch {}
    if (
      !parsed ||
      origin !== parsed.origin ||
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.host !== req.headers.get('host') ||
      req.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new AppError('Submit from the SkillSetu application.', 403);
    if (!req.headers.get('content-type')?.startsWith('application/json'))
      throw new AppError('Send a JSON request.', 415);
    const reader = req.body?.getReader();
    if (!reader) throw new AppError('Missing request.', 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 24576) {
          await reader.cancel();
          throw new AppError('Request is too large.', 413);
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (body.action === 'leave') {
      const response = json({ session: false, run: null });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    if (body.action === 'enter') {
      if (token) {
        await sessionFor(token);
        return json({ session: true });
      }
      const next = await enter(body.name),
        response = json({ session: true });
      response.cookies.set(SESSION_COOKIE, next, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 30 * 86400,
      });
      return response;
    }
    const session = await sessionFor(token);
    if (body.action === 'learning-select')
      return json(await learningRecommendation(session.id, body.sourceRunId, true));
    if (body.action === 'trace-open') return json(openPythonTrace(body.traceId));
    if (body.action === 'trace-next')
      return json(revealPythonTrace(body.traceId, body.version, body.index, body.selected));
    if (body.action === 'start') {
      if (!!body.sourceRunId !== !!body.competencyId)
        throw new AppError('Provide the source report and finding together.', 422);
      return json({
        run: await startLearning(
          session.id,
          body.restart,
          body.lessonId,
          body.sourceRunId && body.competencyId
            ? { sourceRunId: body.sourceRunId, competencyId: body.competencyId }
            : undefined,
        ),
      });
    }
    return json(await learningAction(session.id, body));
  } catch (e) {
    return failure(e);
  }
}
