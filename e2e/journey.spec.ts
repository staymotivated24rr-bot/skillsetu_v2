import { expect, test, type Page } from '@playwright/test';
import { diagnostic, reassessment } from '../src/lib/simulations';
import { lessons } from '../src/lib/lessons';
async function enter(page: Page, name = 'Browser learner') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Find my skill gaps', exact: true }).click();
  await page.getByLabel('What should we call you?').fill(name);
  await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Welcome, ${name}.` })).toBeVisible();
}
async function runCases(
  page: Page,
  kind: 'diagnostic' | 'reassessment',
  correct: boolean,
  refreshAfter?: number,
) {
  const simulations = kind === 'diagnostic' ? diagnostic : reassessment;
  const items = simulations.flatMap((s) => s.items);
  for (const [i, q] of items.entries()) {
    await expect(page.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible();
    const choice = correct ? q.correct : (q.correct + 1) % q.options.length;
    await page.getByRole('radio').nth(choice).check();
    await page.getByRole('button', { name: 'Send response', exact: true }).click();
    await expect(page.getByText(q.options[choice].response, { exact: true })).toBeVisible();
    if (refreshAfter === i) {
      await page.reload();
      if (i < items.length - 1)
        await expect(
          page.getByRole('heading', { name: items[i + 1].prompt, exact: true }),
        ).toBeVisible();
    } else
      await page
        .getByRole('button', {
          name:
            i === 23 ? 'Review submission' : i === 7 || i === 15 ? 'Open next case' : 'Next action',
          exact: true,
        })
        .click();
  }
  await page.getByRole('button', { name: 'Submit assessment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now you know where to focus.' })).toBeVisible();
}
test('complete student journey: simulations → honest gaps → both learning modes → mastery → fresh reassessment → print report', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page);
  await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
  await runCases(page, 'diagnostic', false, 3);
  await expect(
    page.getByRole('heading', { name: 'Needs significant development', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show action feedback', exact: true }).click();
  await expect(page.getByText('Gap signal', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Learning plan', exact: true }).click();
  const l = lessons[0];
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: l.title, exact: true }) });
  await card.getByRole('button', { name: 'Start learning', exact: true }).click();
  await expect(page.getByRole('heading', { name: l.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Structured', exact: true }).click();
  await expect(page.getByText(l.content.example, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Interactive', exact: true }).click();
  await page.getByRole('button', { name: 'Need a hint?', exact: true }).click();
  await expect(page.getByText(l.content.items[0].hint, { exact: true })).toBeVisible();
  for (const [i, q] of l.content.items.entries()) {
    await expect(page.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible();
    await page.getByRole('radio').nth(q.correct).check();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('That’s right.', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: i === 3 ? 'See mastery result' : 'Next problem', exact: true })
      .click();
  }
  await expect(
    page.getByRole('heading', { name: 'You demonstrated this lesson’s objectives.' }),
  ).toBeVisible();
  const state = await (await page.request.get('/api/demo')).json();
  expect(
    state.progress.find((p: { lessonId: string; status: string }) => p.lessonId === l.id).status,
  ).toBe('mastered');
  expect(state.attempts[0].score).toBe(0);
  await page.getByRole('button', { name: 'Verify in a fresh case', exact: true }).click();
  await runCases(page, 'reassessment', true);
  await expect(
    page.getByRole('heading', { name: 'Meets prototype readiness threshold', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('+100 pts', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Readiness report', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your progress, backed by evidence.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Example analytics team' })).toBeVisible();
  await expect(page.getByText('Meets example profile', { exact: true })).toBeVisible();
  await expect(
    page.getByText('SkillSetu readiness is an estimated prototype indicator', { exact: false }),
  ).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.pdf({
    path: 'test-results/skillsetu-sample-report.pdf',
    format: 'A4',
    printBackground: true,
  });
  await page.emulateMedia({ media: 'screen' });
  await page.screenshot({ path: 'test-results/readiness-report.png', fullPage: true });
  // Bad answers on another reassessment must produce a real decline.
  await page.getByRole('button', { name: 'Start reassessment', exact: true }).click();
  await expect
    .poll(async () => {
      const current = await (await page.request.get('/api/demo')).json();
      return current.attempts.some((a: { status: string }) => a.status === 'in_progress');
    })
    .toBe(true);
  const live = await (await page.request.get('/api/demo')).json();
  const attempt = live.attempts.find((a: { status: string }) => a.status === 'in_progress');
  for (const q of reassessment.flatMap((s) => s.items)) {
    const r = await page.request.post('/api/demo', {
      data: {
        action: 'answer',
        attemptId: attempt.id,
        questionId: q.id,
        selected: (q.correct + 1) % q.options.length,
      },
    });
    expect(r.ok()).toBe(true);
  }
  expect(
    (
      await page.request.post('/api/demo', { data: { action: 'complete', attemptId: attempt.id } })
    ).ok(),
  ).toBe(true);
  await page.goto('/#report');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Needs significant development', exact: true }),
  ).toBeVisible();
  expect((await (await page.request.get('/api/demo')).json()).attempts.at(-1).score).toBe(0);
  expect(errors).toEqual([]);
});
test('fictional placement dashboard, clean mobile onboarding, keyboard input and no horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Explore the college demo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'See the gaps. Track the change.' }),
  ).toBeVisible();
  await expect(page.getByText('30', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cohort overview' })).toBeVisible();
  await page.screenshot({ path: 'test-results/placement-dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/landing-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Find my skill gaps', exact: true }).click();
  await page.getByLabel('What should we call you?').fill('Mobile learner');
  await page.getByLabel('What should we call you?').press('Enter');
  await expect(page.getByRole('heading', { name: 'Welcome, Mobile learner.' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: diagnostic[0].items[0].prompt, exact: true }),
  ).toBeVisible();
  await page.getByRole('radio').nth(0).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio').nth(0)).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/simulation-mobile.png', fullPage: true });
});
test('API rejects invalid choices, cross-session access, missing answers and cross-origin submissions', async ({
  page,
}) => {
  expect(
    (
      await page.request.post('/api/demo', { data: { action: 'start', kind: 'diagnostic' } })
    ).status(),
  ).toBe(401);
  expect(
    (await page.request.post('/api/demo', { data: { action: 'enter', name: '' } })).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post('/api/demo', {
        data: { action: 'enter', name: 'API learner' },
        headers: { origin: 'https://unrelated.example' },
      })
    ).status(),
  ).toBe(403);
  await page.request.post('/api/demo', { data: { action: 'enter', name: 'API learner' } });
  const start = await page.request.post('/api/demo', {
    data: { action: 'start', kind: 'diagnostic' },
  });
  const { attemptId } = await start.json();
  expect(
    (
      await page.request.post('/api/demo', {
        data: { action: 'answer', attemptId, questionId: diagnostic[0].items[0].id, selected: 9 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (await page.request.post('/api/demo', { data: { action: 'complete', attemptId } })).status(),
  ).toBe(400);
  await page.request.post('/api/demo', { data: { action: 'new-session' } });
  await page.request.post('/api/demo', { data: { action: 'enter', name: 'Other learner' } });
  expect(
    (
      await page.request.post('/api/demo', {
        data: { action: 'answer', attemptId, questionId: diagnostic[0].items[0].id, selected: 0 },
      })
    ).status(),
  ).toBe(404);
});
