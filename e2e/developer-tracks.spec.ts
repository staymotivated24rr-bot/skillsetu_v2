import { expect, test, type Page } from '@playwright/test';
import { tracks } from '../src/lib/tracks';
type Track = (typeof tracks)[number];
async function runCases(
  page: Page,
  track: Track,
  kind: 'diagnostic' | 'reassessment',
  correct: boolean,
) {
  const items = track[kind].flatMap((s) => s.items);
  for (const [i, q] of items.entries()) {
    await expect(page.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible();
    const choice = correct ? q.correct : (q.correct + 1) % q.options.length;
    await page.getByRole('radio').nth(choice).check();
    await page.getByRole('button', { name: 'Send response', exact: true }).click();
    await expect(page.getByText(q.options[choice].response, { exact: true })).toBeVisible();
    if (i === 2) {
      // Changing tracks preserves the learner's partial case, without lending its evidence to Data Analyst.
      await page.getByLabel('Target role', { exact: true }).selectOption('data-analyst');
      await expect(page.getByLabel('Target role', { exact: true })).toBeEnabled();
      await expect(page.getByLabel('Target role', { exact: true })).toHaveValue('data-analyst');
      const other = await (await page.request.get('/api/demo')).json();
      expect(other.attempts).toHaveLength(0);
      await page.getByLabel('Target role', { exact: true }).selectOption(track.role.id);
      await expect(page.getByLabel('Target role', { exact: true })).toBeEnabled();
      await expect(page.getByLabel('Target role', { exact: true })).toHaveValue(track.role.id);
      await page
        .getByRole('button', {
          name: kind === 'diagnostic' ? 'Resume workplace diagnostic' : 'Resume reassessment',
          exact: true,
        })
        .click();
      await expect(
        page.getByRole('heading', { name: items[i + 1].prompt, exact: true }),
      ).toBeVisible();
    } else {
      await page
        .getByRole('button', {
          name:
            i === 23 ? 'Review submission' : i === 7 || i === 15 ? 'Open next case' : 'Next action',
          exact: true,
        })
        .click();
    }
  }
  await page.getByRole('button', { name: 'Submit assessment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now you know where to focus.' })).toBeVisible();
}
for (const track of tracks.filter((t) => t.role.id === 'java-developer'))
  test(`${track.role.name}: role selection → workplace decisions → both learning modes → reassessment → report`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Find my skill gaps', exact: true }).click();
    await page.locator('.role-choice').filter({ hasText: track.role.name }).click();
    await page.getByLabel('What should we call you?').fill(`${track.role.name} learner`);
    await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
    await expect(page.getByLabel('Target role', { exact: true })).toHaveValue(track.role.id);
    await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
    await runCases(page, track, 'diagnostic', false);
    await expect(
      page.getByRole('heading', { name: 'Needs significant development', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Learning plan', exact: true }).click();
    const lesson = track.lessons[0];
    await page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: lesson.title, exact: true }) })
      .getByRole('button', { name: 'Start learning', exact: true })
      .click();
    await page.getByRole('button', { name: 'Structured', exact: true }).click();
    await expect(page.getByText(lesson.content.example, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Interactive', exact: true }).click();
    await page.getByRole('button', { name: 'Need a hint?', exact: true }).click();
    await expect(page.getByText(lesson.content.items[0].hint, { exact: true })).toBeVisible();
    for (const [i, q] of lesson.content.items.entries()) {
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
    await page.reload();
    const state = await (await page.request.get('/api/demo')).json();
    expect(state.progress[0].status).toBe('mastered');
    expect(state.attempts[0].score).toBe(0);
    await page.getByRole('button', { name: 'Verify with new cases', exact: true }).click();
    await runCases(page, track, 'reassessment', true);
    await expect(
      page.getByRole('heading', { name: 'Meets prototype readiness threshold', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('+100 pts', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Readiness report', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: track.employerName, exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Meets example profile', { exact: true })).toBeVisible();
    await expect(page.locator('.page-heading')).toContainText(track.role.name);
    await expect(page.locator('.report-hero')).toContainText(track.role.name.toUpperCase());
    await expect(page.locator('.report-hero')).toContainText(
      `${track.skills.length} measured skills`,
    );
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.sidebar')).toBeHidden();
    await page.pdf({
      path: `test-results/${track.role.id}-report.pdf`,
      format: 'A4',
      printBackground: true,
    });
    await page.emulateMedia({ media: 'screen' });
    await page.screenshot({ path: `test-results/${track.role.id}-report.png`, fullPage: true });
    await page.getByRole('button', { name: 'Start reassessment', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: track.reassessment[0].items[0].prompt, exact: true }),
    ).toBeVisible();
    const live = await (await page.request.get('/api/demo')).json();
    const attempt = live.attempts.find((a: { status: string }) => a.status === 'in_progress');
    for (const q of track.reassessment.flatMap((s) => s.items))
      expect(
        (
          await page.request.post('/api/demo', {
            data: {
              action: 'answer',
              attemptId: attempt.id,
              questionId: q.id,
              selected: (q.correct + 1) % q.options.length,
            },
          })
        ).ok(),
      ).toBe(true);
    expect(
      (
        await page.request.post('/api/demo', {
          data: { action: 'complete', attemptId: attempt.id },
        })
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
test('all role cohorts and mobile developer onboarding are scoped and responsive', async ({
  page,
}) => {
  await page.goto('/#college');
  for (const track of tracks) {
    await page.getByLabel('Cohort role', { exact: true }).selectOption(track.role.id);
    await expect(page.locator('.page-heading')).toContainText(track.role.name.toUpperCase());
    const cohort = await (
      await page.request.get(`/api/demo?view=cohort&roleId=${track.role.id}`)
    ).json();
    expect(cohort.skills).toHaveLength(track.skills.length);
    expect(cohort.members).toHaveLength(30);
  }
  expect((await page.request.get('/api/demo?view=cohort&roleId=unknown')).status()).toBe(400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#workspace');
  await page.locator('.role-choice').filter({ hasText: 'Java Developer' }).click();
  await page.getByLabel('What should we call you?').fill('Mobile developer');
  await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
  await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/java-mobile.png', fullPage: true });
  expect(
    (
      await page.request.post('/api/demo', { data: { action: 'select-role', roleId: 'unknown' } })
    ).status(),
  ).toBe(400);
});
