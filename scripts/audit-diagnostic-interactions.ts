import { chromium, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { reviewedDiagnostic as bank } from '../src/lib/diagnostic/reviewed-bank';
import { db } from '../src/lib/db';
import type { Answer, Question, RunView } from '../src/lib/diagnostic/types';

async function main() {
  const base = 'http://127.0.0.1:3002';
  const dir = 'docs/diagnostic-v2/interaction-audit';
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (url.hostname !== '127.0.0.1' || url.port !== '15432' || url.pathname !== '/skillsetu_audit')
    throw Error('Only the named local disposable audit database is allowed');
  mkdirSync(dir + '/screenshots', { recursive: true });
  const events: Record<string, unknown>[] = [];
  const cases: Record<string, unknown>[] = [];
  const findings: Record<string, unknown>[] = [];
  const createdRuns = new Set<string>();
  const logs: Record<string, unknown>[] = [];
  const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
  const tables = [
    'user',
    'diagnosticRun',
    'diagnosticResponse',
    'assessmentBank',
    'assessmentAttempt',
    'assessmentAnswer',
    'readinessReport',
    'lessonProgress',
    'practiceAnswer',
    'taskEvidence',
    'repairRun',
    'repairAnswer',
  ] as const;
  async function snapshot() {
    const rows: Record<string, string> = {};
    for (const table of tables) {
      const records = await (
        db[table] as unknown as { findMany: () => Promise<{ id: string }[]> }
      ).findMany();
      for (const r of records) rows[table + '/' + r.id] = hash(r);
    }
    return rows;
  }
  const before = await snapshot();
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  let actionCount = 0;
  async function action(scope: string, name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      events.push({ scope, action: name, result: 'pass' });
      actionCount++;
    } catch (e) {
      events.push({ scope, action: name, result: 'fail', error: String(e).slice(0, 650) });
      throw e;
    }
  }
  function finding(id: string, scope: string, summary: string, details: unknown) {
    if (!findings.some((f) => f.id === id && f.scope === scope))
      findings.push({ id, scope, summary, details });
  }
  async function state(page: Page, id?: string): Promise<RunView> {
    return (
      await (await page.request.get(base + '/api/diagnostic-v2' + (id ? '?run=' + id : ''))).json()
    ).run;
  }
  async function fresh(scope: string, mobile = false) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    page.on('pageerror', (e) => logs.push({ scope, type: 'pageerror', message: e.message }));
    await page.goto(base + '/diagnostic-v2');
    await page.getByLabel('What should we call you?').fill('Exhaustive QA ' + scope.slice(0, 20));
    await page.getByRole('button', { name: 'Explore my Python skills' }).click();
    await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
    const run = await state(page);
    createdRuns.add(run.id);
    if (!(await db.diagnosticRun.findUnique({ where: { id: run.id } })))
      throw Error('Browser/server database mismatch');
    return { context, page, run };
  }
  async function screen(page: Page, name: string) {
    await page.screenshot({
      path: `${dir}/screenshots/${name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  async function choose(page: Page, q: Question, answer: Answer) {
    if (q.options) await page.getByRole('radio').nth(answer.selected!).check();
    else if (q.steps) {
      const current = await page.locator('main ol li > span').allTextContents();
      const ids = current.map((text) => q.steps!.find((s) => s.text === text)!.id);
      for (let target = 0; target < answer.order!.length; target++) {
        let i = ids.indexOf(answer.order![target]);
        while (i > target) {
          await page.getByRole('button', { name: `Move step ${i + 1} up`, exact: true }).click();
          [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
          i--;
        }
      }
    } else await page.getByLabel('Your answer', { exact: true }).fill(answer.text!);
  }
  async function special(page: Page, q: Question, scope: string) {
    if (q.interaction === 'state-cards') {
      const prev = page.getByRole('button', { name: 'Previous statement' }),
        next = page.getByRole('button', { name: 'Next statement' });
      await expect(prev).toBeDisabled();
      let n = 0;
      while (await next.isEnabled()) {
        await action(scope, `next state ${++n}`, () => next.click());
        await page.getByLabel('Predicted state at this transition').fill('scratch-' + n);
        if (n > 10) throw Error('Unbounded state cards');
      }
      await expect(next).toBeDisabled();
      while (await prev.isEnabled()) await action(scope, 'previous state', () => prev.click());
      await page.getByLabel('Predicted state at this transition').fill('Audit scratch note');
    }
    if (q.interaction === 'loop-boundary') {
      const slider = page.getByRole('slider'),
        number = page.getByRole('spinbutton');
      await slider.press('Home');
      for (let i = 0; i <= 7; i++) {
        if (i) await slider.press('ArrowRight');
        await action(scope, `slider stop ${i}`, async () => {
          await expect(number).toHaveValue(String(i));
          await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(String(i));
        });
      }
      for (const i of [0, 1, 2, 3, 4, 5, 6, 7, -1, 8])
        await action(scope, `number stop ${i}`, async () => {
          await number.fill(String(i));
          await expect(number).toHaveValue(String(Math.max(0, Math.min(7, i))));
        });
    }
    if (q.interaction === 'error-location') {
      const radios = page.getByRole('radio');
      for (let i = 0; i < (await radios.count()); i++)
        await action(scope, `inspect source line ${i + 1}`, async () => {
          await radios.nth(i).check();
          await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(String(i + 1));
        });
    }
    if (q.steps) {
      const n = q.steps.length;
      await expect(
        page.getByRole('button', { name: 'Move step 1 up', exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByRole('button', { name: `Move step ${n} down`, exact: true }),
      ).toBeDisabled();
      for (let i = 1; i < n; i++)
        await action(scope, `move ${i + 1} up then ${i} down`, async () => {
          await page.getByRole('button', { name: `Move step ${i + 1} up`, exact: true }).click();
          await page.getByRole('button', { name: `Move step ${i} down`, exact: true }).click();
        });
      for (let i = 1; i < n; i++)
        await action(scope, `move ${i} down then ${i + 1} up`, async () => {
          await page.getByRole('button', { name: `Move step ${i} down`, exact: true }).click();
          await page.getByRole('button', { name: `Move step ${i + 1} up`, exact: true }).click();
        });
    }
  }
  const start = new Date().toISOString();
  for (const [qi, q] of bank.questions.entries()) {
    const variants: { name: string; answer: Answer; correct: boolean }[] = q.options
      ? q.options.map((_, selected) => ({
          name: 'option-' + (selected + 1),
          answer: { selected },
          correct: selected === q.correct,
        }))
      : q.steps
        ? [
            { name: 'authored-sequence', answer: { order: q.order }, correct: true },
            {
              name: 'reverse-sequence',
              answer: { order: [...q.order!].reverse() },
              correct: false,
            },
          ]
        : [
            ...q.expected!.map((text, i) => ({
              name: 'accepted-format-' + (i + 1),
              answer: { text },
              correct: true,
            })),
            { name: 'unsure', answer: { text: 'unsure' }, correct: false },
            { name: 'semantic-mismatch', answer: { text: '__audit_invalid__' }, correct: false },
          ];
    let fixture: Awaited<ReturnType<typeof fresh>> | undefined;
    try {
      fixture = await fresh(q.id, qi % 2 === 1);
      const { page, run } = fixture;
      const template = (await db.diagnosticRun.findUnique({ where: { id: run.id } }))!;
      for (const [vi, v] of variants.entries()) {
        let id = run.id;
        const scope = q.id + '/' + v.name;
        try {
          const data = {
            sessionId: template.sessionId,
            roleId: template.roleId,
            bankId: template.bankId,
            engineVersion: template.engineVersion,
            bankSnapshot: template.bankSnapshot,
            bankDigest: template.bankDigest,
            currentQuestionId: q.id,
            currentRationale: 'Disposable exhaustive UI fixture; not an adaptive selection trace',
            draft: '{}',
            hintUsed: false,
          };
          if (vi === 0) await db.diagnosticRun.update({ where: { id }, data });
          else {
            id = (await db.diagnosticRun.create({ data })).id;
            createdRuns.add(id);
          }
          await page.goto(base + '/diagnostic-v2?run=' + id);
          await page.getByRole('button', { name: 'Resume diagnostic' }).click();
          await expect(page.getByRole('heading', { level: 1 })).toHaveText(q.title);
          await action(scope, 'why task disclosure open/close', async () => {
            const s = page.getByText('Why this task?', { exact: true });
            await s.click();
            await expect(page.getByText(data.currentRationale, { exact: true })).toBeVisible();
            await s.click();
          });
          if (!q.steps)
            await expect(
              page.getByRole('button', { name: 'Submit response', exact: true }),
            ).toBeDisabled();
          if (vi === 0) {
            if (qi % 2 === 1)
              await action(scope, 'mobile learning map open/close', async () => {
                const s = page.getByText('My learning map · six core areas', { exact: true });
                await s.click();
                await expect(page.locator('[aria-current="step"]:visible')).toHaveCount(1);
                await s.click();
              });
            await special(page, q, scope);
            await screen(page, q.id);
            await action(scope, 'process hint saves assistance without submitting', async () => {
              await page.getByRole('button', { name: 'Process hint', exact: true }).click();
              await expect(page.getByRole('status').filter({ hasText: q.hint })).toBeVisible();
              await expect(
                page.getByRole('button', { name: 'Process hint', exact: true }),
              ).toBeDisabled();
              if ((await state(page, id)).answered !== 0) throw Error('Hint submitted an answer');
            });
          }
          await choose(page, q, v.answer);
          if (vi === 0) {
            await expect.poll(async () => (await state(page, id)).draft).toEqual(v.answer);
            await page.reload();
            await page.getByRole('button', { name: 'Resume diagnostic' }).click();
            if (q.options)
              await expect(page.getByRole('radio').nth(v.answer.selected!)).toBeChecked();
            else if (q.steps)
              await expect(page.locator('main ol li > span')).toHaveText(
                v.answer.order!.map((id) => q.steps!.find((s) => s.id === id)!.text),
              );
            else
              await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue(
                v.answer.text!,
              );
            if (q.interaction === 'loop-boundary') {
              const candidate = await page.getByRole('spinbutton').inputValue();
              if (candidate !== v.answer.text) {
                finding(
                  'resume-control-desync',
                  q.id,
                  'Candidate boundary resets while saved answer is restored',
                  { savedAnswerPreserved: true, candidateResetTo: candidate },
                );
                await screen(page, q.id + '-resume-discrepancy');
              }
            }
            if (
              q.interaction === 'error-location' &&
              (await page.locator('input[type=radio]:checked').count()) === 0
            )
              finding(
                'resume-localization-desync',
                q.id,
                'Source-line selection is lost on refresh while the answer remains saved',
                { savedAnswerPreserved: true },
              );
            if (
              q.interaction === 'state-cards' &&
              (await page.getByLabel('Predicted state at this transition').inputValue()) === ''
            )
              finding(
                'scratch-not-persisted',
                q.id,
                'Transition scratch notes are not restored by refresh',
                { answerPreserved: true },
              );
          }
          await action(scope, 'submit saves exactly one graded response', async () => {
            await page.getByRole('button', { name: 'Submit response', exact: true }).click();
            await expect(page.getByText('Response saved', { exact: true })).toBeVisible();
            const saved = await state(page, id);
            if (
              saved.answered !== 1 ||
              (await db.diagnosticResponse.findFirstOrThrow({ where: { runId: id } })).correct !==
                v.correct ||
              saved.lastFeedback?.assisted !== (vi === 0)
            )
              throw Error('Persisted feedback differs from authored contract/assistance');
          });
          await action(scope, 'continue discovery button', async () => {
            await page.getByRole('button', { name: 'Continue discovery' }).click();
            await expect(
              page.getByRole('button', { name: 'Submit response', exact: true }),
            ).toBeVisible();
          });
          cases.push({
            questionId: q.id,
            title: q.title,
            competency: q.competencyId,
            type: q.type,
            interaction: q.interaction ?? null,
            difficulty: q.difficulty,
            variant: v.name,
            result: 'pass',
            assisted: vi === 0,
          });
        } catch (e) {
          cases.push({
            questionId: q.id,
            variant: v.name,
            result: 'fail',
            error: String(e).slice(0, 700),
          });
          await screen(page, q.id + '-' + v.name + '-failure').catch(() => {});
        }
      }
    } catch (e) {
      cases.push({ questionId: q.id, result: 'setup-fail', error: String(e).slice(0, 700) });
    } finally {
      await fixture?.context.close();
    }
    console.log(
      JSON.stringify({
        question: qi + 1,
        id: q.id,
        variants: variants.length,
        failed: cases.filter((c) => c.questionId === q.id && c.result !== 'pass').length,
      }),
    );
    writeFileSync(
      dir + '/RESULTS.json',
      JSON.stringify(
        {
          start,
          bank: bank.id,
          totalAuthoredQuestions: bank.questions.length,
          cases,
          events,
          findings,
          logs,
        },
        null,
        2,
      ),
    );
  }
  // Finish below with natural journeys, recovery controls and historical preservation.
  const journeys: Record<string, unknown>[] = [];
  for (const profile of ['strong', 'struggling', 'mixed']) {
    let fixture: Awaited<ReturnType<typeof fresh>> | undefined;
    try {
      fixture = await fresh('natural-' + profile, profile === 'struggling');
      const { page } = fixture;
      let run = fixture.run;
      const trace: Record<string, unknown>[] = [];
      let n = 0;
      while (run.current) {
        const q = bank.questions.find((q) => q.id === run.current!.id)!;
        const correct = profile === 'strong' || (profile === 'mixed' && n % 3 !== 0);
        if (profile === 'struggling' && n === 0)
          await page.getByRole('button', { name: 'Process hint', exact: true }).click();
        const answer: Answer = q.options
          ? { selected: correct ? q.correct! : (q.correct! + 1) % q.options.length }
          : q.steps
            ? { order: correct ? q.order : [...q.order!].reverse() }
            : { text: correct ? q.expected![0] : 'unsure' };
        trace.push({
          position: n + 1,
          questionId: q.id,
          competency: q.competencyId,
          difficulty: q.difficulty,
          type: q.type,
          answerClass: correct ? 'authored-match' : 'non-match-or-unsure',
          rationale: run.rationale,
        });
        await choose(page, q, answer);
        await page.getByRole('button', { name: 'Submit response', exact: true }).click();
        await expect(page.getByText('Response saved', { exact: true })).toBeVisible();
        run = await state(page);
        n++;
        await page
          .getByRole('button', {
            name: run.status === 'completed' ? 'See my skill map' : 'Continue discovery',
          })
          .click();
        if (n > 30) throw Error('Maximum exceeded');
      }
      const sealed = JSON.stringify(run.report);
      const reportUrl = base + '/diagnostic-v2?run=' + run.id;
      await action(profile, 'bookmark report link', async () => {
        await page.getByRole('link', { name: 'Bookmark this report' }).click();
        await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
      });
      await action(profile, 'submitted evidence disclosure open/close', async () => {
        const s = page.getByText('Review your submitted evidence & explanations', { exact: true });
        await s.click();
        await expect(page.getByRole('heading', { level: 3 })).toHaveCount(n);
        await s.click();
      });
      await screen(page, 'natural-' + profile + '-report');
      if (profile === 'struggling') {
        for (let i = 0; i < 6; i++) {
          await page.getByRole('link', { name: 'Explore the SkillSetu module' }).nth(i).click();
          await expect(page.getByRole('heading', { name: 'Build the intuition' })).toBeVisible();
          for (let choice = 0; choice < 2; choice++) {
            const scope = 'lesson-' + i + '-choice-' + choice;
            await action(scope, 'prediction required and compare example', async () => {
              if (choice === 0)
                await expect(
                  page.getByRole('button', { name: 'Compare with the worked example' }),
                ).toBeDisabled();
              await page
                .getByLabel('Predict a boundary case and its expected outcome')
                .fill('Audit boundary case: empty, valid and invalid inputs.');
              await page.getByRole('button', { name: 'Compare with the worked example' }).click();
            });
            await action(scope, 'select practice option and check reasoning', async () => {
              await expect(page.getByRole('button', { name: 'Check my reasoning' })).toBeDisabled();
              await page.getByRole('radio').nth(choice).check();
              await page.getByRole('button', { name: 'Check my reasoning' }).click();
              await expect(
                page.getByRole('status').filter({ hasText: 'Stage 3 of 3' }),
              ).toBeVisible();
            });
            if (choice === 1) await screen(page, 'lesson-' + i);
            await action(scope, 'try another case', async () => {
              await page.getByRole('button', { name: 'Try another case' }).click();
              await expect(
                page.getByRole('status').filter({ hasText: 'Stage 1 of 3' }),
              ).toBeVisible();
            });
          }
          await action('lesson-' + i, 'return to skill map preserves sealed report', async () => {
            await page.getByRole('link', { name: 'Return to my skill map' }).click();
            await expect(
              page.getByRole('heading', { name: 'Evidence into direction.' }),
            ).toBeVisible();
            if (JSON.stringify((await state(page, run.id)).report) !== sealed)
              throw Error('Practice changed diagnostic report');
          });
        }
        const plan = page
          .getByRole('heading', { name: 'Your next learning steps' })
          .locator('..')
          .getByRole('link');
        const links = await plan.count();
        for (let i = 0; i < links; i++) {
          await page
            .getByRole('heading', { name: 'Your next learning steps' })
            .locator('..')
            .getByRole('link')
            .nth(i)
            .click();
          await expect(page.getByRole('heading', { name: 'Build the intuition' })).toBeVisible();
          await page.getByRole('link', { name: 'Return to my skill map' }).click();
          events.push({ scope: profile, action: 'learning-order link ' + i, result: 'pass' });
        }
        await action(profile, 'prior-informed reassessment button', async () => {
          await page
            .getByRole('button', { name: 'Reassess using my prior report for routing' })
            .click();
          await expect(
            page.getByRole('button', { name: 'Submit response', exact: true }),
          ).toBeVisible();
          const next = await state(page);
          createdRuns.add(next.id);
          if (next.answered !== 0 || !next.rationale.includes('previously unresolved'))
            throw Error('Routing disclosure or no-credit contract failed');
        });
      } else if (profile === 'strong') {
        await action(profile, 'brand navigation and browser back', async () => {
          await page.getByRole('link', { name: 'S SkillSetu THE LEARNING STUDIO' }).click();
          await expect(page).toHaveURL(base + '/');
          await page.goBack();
          await expect(
            page.getByRole('heading', { name: 'Evidence into direction.' }),
          ).toBeVisible();
        });
        await action(profile, 'independent fresh diagnostic button', async () => {
          await page.getByRole('button', { name: 'Start an independent fresh diagnostic' }).click();
          await expect(
            page.getByRole('button', { name: 'Submit response', exact: true }),
          ).toBeVisible();
          const next = await state(page);
          createdRuns.add(next.id);
          if (next.answered !== 0 || !next.rationale.startsWith('Independent fresh diagnostic'))
            throw Error('Fresh run routing contract failed');
        });
      }
      await page.goto(reportUrl);
      await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
      if (JSON.stringify((await state(page, run.id)).report) !== sealed)
        throw Error('Historical report changed after starting another run');
      journeys.push({
        profile,
        result: 'pass',
        answered: n,
        stopReason: run.report?.stopReason,
        findings: run.report?.findings.map((f) => ({
          competency: f.competencyId,
          status: f.status,
          count: f.count,
          independent: f.independent,
          types: f.types,
        })),
        trace,
      });
    } catch (e) {
      journeys.push({ profile, result: 'fail', error: String(e).slice(0, 800) });
      if (fixture) await screen(fixture.page, 'natural-' + profile + '-failure').catch(() => {});
    } finally {
      await fixture?.context.close();
    }
    console.log('Natural journey ' + profile + ' ' + journeys.at(-1)?.result);
  }
  let recovery: Awaited<ReturnType<typeof fresh>> | undefined;
  try {
    recovery = await fresh('recovery-controls');
    const { page, context, run } = recovery;
    await page.getByLabel('Your answer', { exact: true }).fill('unsure');
    await expect.poll(async () => (await state(page)).draft).toEqual({ text: 'unsure' });
    await context.route('**/api/diagnostic-v2', (route) =>
      route.request().postDataJSON()?.action === 'answer'
        ? route.abort('failed')
        : route.continue(),
    );
    await page.getByRole('button', { name: 'Submit response', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await screen(page, 'network-error');
    await action('recovery', 'reconnect and resume button', async () => {
      await page.getByRole('button', { name: 'Reconnect & resume' }).click();
      await page.getByRole('button', { name: 'Resume diagnostic' }).click();
      await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('unsure');
      if ((await state(page)).answered !== 0) throw Error('Offline save changed response count');
    });
    await context.unroute('**/api/diagnostic-v2');
    await action('recovery', 'rapid double click saves once', async () => {
      await page.getByRole('button', { name: 'Submit response', exact: true }).dblclick();
      await expect(page.getByText('Response saved', { exact: true })).toBeVisible();
      if ((await state(page)).answered !== 1) throw Error('Duplicate response');
    });
    await page.getByRole('button', { name: 'Continue discovery' }).click();
    const nextState = await state(page);
    const q = bank.questions.find((q) => q.id === nextState.current!.id)!;
    await choose(
      page,
      q,
      q.options ? { selected: 0 } : q.steps ? { order: q.order } : { text: 'unsure' },
    );
    await context.route('**/api/diagnostic-v2', (route) =>
      route.request().postDataJSON()?.action === 'answer'
        ? route.abort('failed')
        : route.continue(),
    );
    await page.getByRole('button', { name: 'Submit response', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await action('recovery', 'start new browser session button preserves old run', async () => {
      await page.getByRole('button', { name: 'Start a new browser session' }).click();
      await expect(page.getByLabel('What should we call you?')).toBeVisible();
      if (!(await db.diagnosticRun.findUnique({ where: { id: run.id } })))
        throw Error('Old run deleted');
    });
  } catch (e) {
    events.push({ scope: 'recovery', result: 'fail', error: String(e).slice(0, 800) });
    if (recovery) await screen(recovery.page, 'recovery-failure').catch(() => {});
  } finally {
    await recovery?.context.close();
  }
  const after = await snapshot();
  const changed = Object.keys(before).filter((k) => after[k] !== before[k]);
  const summary = {
    start,
    end: new Date().toISOString(),
    bank: bank.id,
    totalAuthoredQuestions: bank.questions.length,
    uniqueQuestionsExercised: new Set(
      cases.filter((c) => c.result === 'pass').map((c) => c.questionId),
    ).size,
    caseCount: cases.length,
    passedCases: cases.filter((c) => c.result === 'pass').length,
    failedCases: cases.filter((c) => c.result !== 'pass').length,
    successfulRecordedActions: actionCount,
    findings: findings.length,
    preexistingRecordsChecked: Object.keys(before).length,
    preexistingRecordsChanged: changed.length,
    createdDisposableRuns: createdRuns.size,
    buildId: readFileSync('.next/BUILD_ID', 'utf8').trim(),
    scope:
      'Published reviewed bank and diagnostic/linked repair UI; fixtures are not adaptive journey evidence; no learner code execution',
  };
  writeFileSync(
    dir + '/RESULTS.json',
    JSON.stringify(
      {
        summary,
        cases,
        events,
        journeys,
        findings,
        logs,
        preservation: {
          changed,
          baselineDigest: hash(before),
          preexistingRecordCount: Object.keys(before).length,
        },
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(summary));
  await browser.close();
  await db.$disconnect();
}
void main().catch(async (error: unknown) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
