import {
  evaluateAuthentic,
  submitAuthentic,
  repairAction,
  repairTask,
} from '@/lib/authentic/service';
import { roleCatalog } from '@/lib/role-catalog';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import {
  answerAssessment,
  AppError,
  cohortState,
  completeAssessment,
  createStudent,
  getState,
  lessonAction,
  practiceAction,
  reviewAttempt,
  startAssessment,
  selectRole,
} from '@/lib/service';
import { db, deploymentDatabaseIssue } from '@/lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookieName = 'skillsetu-demo';
const id = z.string().min(1).max(100);
const roleId = id.refine((value) => roleCatalog.some((role) => role.id === value), 'Unknown role');
function boundedOutput(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 2000;
  if (Array.isArray(value))
    return value.length <= 100 && value.every((v) => boundedOutput(v, depth + 1));
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    return (
      entries.length <= 100 &&
      entries.every(([k, v]) => k.length <= 200 && boundedOutput(v, depth + 1))
    );
  }
  return false;
}
const payload = z
  .object({
    selected: z.number().int().min(0).max(10).optional(),
    text: z.string().max(4000).optional(),
    order: z.array(id).max(20).optional(),
    code: z.string().max(12000).optional(),
    outputs: z
      .array(z.unknown().refine((value) => boundedOutput(value), 'Output is too complex'))
      .max(20)
      .optional(),
  })
  .strict();
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('task'), attemptId: id, taskId: id, payload }),
  z.object({ action: z.literal('evaluate'), attemptId: id, taskId: id, payload }),
  z.object({
    action: z.literal('repair'),
    skillId: id,
    mode: z.enum(['structured', 'interactive']),
    restart: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('repair-task'),
    skillId: id,
    taskId: id,
    payload: payload.optional(),
    evaluate: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('enter'),
    name: z.string().trim().min(1).max(40),
    roleId: roleId.optional(),
  }),
  z.object({ action: z.literal('select-role'), roleId }),
  z.object({
    action: z.literal('start'),
    kind: z.enum(['diagnostic', 'reassessment']),
    roleId: roleId.optional(),
  }),
  z.object({
    action: z.literal('answer'),
    attemptId: id,
    questionId: id,
    selected: z.number().int().min(0).max(10),
  }),
  z.object({ action: z.literal('complete'), attemptId: id }),
  z.object({
    action: z.literal('lesson'),
    lessonId: id,
    mode: z.enum(['interactive', 'structured']),
    restart: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('practice'),
    lessonId: id,
    itemId: id,
    selected: z.number().int().min(0).max(10).optional(),
  }),
  z.object({ action: z.literal('new-session') }),
]);
async function userId() {
  const value = (await cookies()).get(cookieName)?.value;
  if (
    !value ||
    !z.uuid().safeParse(value).success ||
    !(await db.user.findUnique({ where: { id: value } }))
  )
    throw new AppError('Enter the student demo to continue.', 401);
  return value;
}
function failure(e: unknown) {
  if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof z.ZodError)
    return NextResponse.json({ error: 'Please check your input and try again.' }, { status: 400 });
  console.error('SkillSetu request failed:', e instanceof Error ? e.message : 'Unknown error');
  return NextResponse.json(
    { error: 'Could not complete the request. Check the database setup and try again.' },
    { status: 500 },
  );
}
export async function GET(req: NextRequest) {
  try {
    const databaseIssue = deploymentDatabaseIssue();
    if (databaseIssue)
      return NextResponse.json(
        { error: databaseIssue },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    if (req.nextUrl.searchParams.get('view') === 'cohort')
      return NextResponse.json(
        await cohortState(req.nextUrl.searchParams.get('roleId') ?? 'data-analyst'),
        { headers: { 'Cache-Control': 'no-store' } },
      );
    const session = (await cookies()).get(cookieName)?.value;
    if (!session && !req.nextUrl.searchParams.has('review'))
      return NextResponse.json({ session: null }, { headers: { 'Cache-Control': 'no-store' } });
    const uid = await userId();
    const review = req.nextUrl.searchParams.get('review');
    return NextResponse.json(review ? await reviewAttempt(uid, review) : await getState(uid), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const databaseIssue = deploymentDatabaseIssue();
    if (databaseIssue)
      return NextResponse.json(
        { error: databaseIssue },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    const origin = req.headers.get('origin');
    if (origin) {
      let originUrl: URL;
      try {
        originUrl = new URL(origin);
      } catch {
        throw new AppError('Invalid request origin.', 403);
      }
      if (
        !['http:', 'https:'].includes(originUrl.protocol) ||
        originUrl.host !== req.headers.get('host')
      )
        throw new AppError('Use the application to submit demo actions.', 403);
    }
    if (Number(req.headers.get('content-length') ?? 0) > 16384)
      throw new AppError('Request is too large.', 413);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 16384)
      throw new AppError('Request is too large.', 413);
    const body = schema.parse(JSON.parse(raw));
    if (body.action === 'enter') {
      const existing = (await cookies()).get(cookieName)?.value;
      if (
        existing &&
        z.uuid().safeParse(existing).success &&
        (await db.user.findUnique({ where: { id: existing } }))
      )
        return NextResponse.json({ ok: true });
      const user = await createStudent(body.name, body.roleId);
      const response = NextResponse.json({ ok: true });
      response.cookies.set(cookieName, user.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        secure: req.nextUrl.protocol === 'https:',
      });
      return response;
    }
    if (body.action === 'new-session') {
      const response = NextResponse.json({ ok: true });
      response.cookies.delete(cookieName);
      return response;
    }
    const uid = await userId();
    switch (body.action) {
      case 'task':
        return NextResponse.json(
          await submitAuthentic(uid, body.attemptId, body.taskId, body.payload),
        );
      case 'evaluate':
        return NextResponse.json(
          await evaluateAuthentic(uid, body.attemptId, body.taskId, body.payload),
        );
      case 'repair':
        await repairAction(uid, body.skillId, body.mode, body.restart);
        return NextResponse.json({ ok: true });
      case 'repair-task':
        return NextResponse.json(
          await repairTask(uid, body.skillId, body.taskId, body.payload, body.evaluate),
        );
      case 'select-role':
        await selectRole(uid, body.roleId);
        return NextResponse.json({ ok: true });
      case 'start':
        return NextResponse.json({ attemptId: await startAssessment(uid, body.kind, body.roleId) });
      case 'answer':
        return NextResponse.json(
          await answerAssessment(uid, body.attemptId, body.questionId, body.selected),
        );
      case 'complete':
        return NextResponse.json({ attemptId: await completeAssessment(uid, body.attemptId) });
      case 'lesson':
        await lessonAction(uid, body.lessonId, body.mode, body.restart);
        return NextResponse.json({ ok: true });
      case 'practice':
        return NextResponse.json(
          await practiceAction(uid, body.lessonId, body.itemId, body.selected),
        );
    }
  } catch (e) {
    if (e instanceof SyntaxError)
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    return failure(e);
  }
}
