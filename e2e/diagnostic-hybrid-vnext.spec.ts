import { test, expect } from '@playwright/test';
import { HYBRID_VERSION } from '../src/lib/diagnostic/hybrid-vnext';
import type { RunView } from '../src/lib/diagnostic/types';
test('unsure remains uncertainty through refresh, direct transitions and an owned final review', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2?preview=starter-v3');
  await page.getByLabel('What should we call you?').fill('Hybrid uncertainty QA');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const read = async (): Promise<RunView> =>
    (await (await page.request.get('/api/diagnostic-v2?preview=starter-v3')).json()).run;
  let run = await read();
  await page.getByRole('button', { name: 'I’m not sure', exact: true }).click();
  const first = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/diagnostic-v2') &&
      r.request().method() === 'POST' &&
      r.request().postDataJSON()?.action === 'answer',
  );
  await page.getByRole('button', { name: 'Submit response', exact: true }).click();
  run = (await (await first).json()).run;
  await expect(page.getByRole('heading', { name: run.current!.title, exact: true })).toBeVisible();
  expect(run.report).toBeNull();
  expect(run.review).toBeNull();
  expect(run.lastFeedback).not.toHaveProperty('correct');
  const origin = new URL(page.url()).origin;
  while (run.current) {
    if (run.answered === 12) {
      const id = run.current.id;
      await page.reload();
      await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
      expect((await read()).current!.id).toBe(id);
      await expect(
        page.getByRole('heading', { name: run.current.title, exact: true }),
      ).toBeVisible();
    }
    const result = await page.request.post('/api/diagnostic-v2', {
      headers: { Origin: origin },
      data: {
        action: 'answer',
        runId: run.id,
        questionId: run.current.id,
        answer: { text: 'unsure' },
      },
    });
    expect(result.ok()).toBe(true);
    run = (await result.json()).run;
  }
  expect(run.answered).toBe(30);
  expect(run.report!.engineVersion).toBe(HYBRID_VERSION);
  expect(
    run.report!.findings.every(
      (f) => f.status === 'Insufficient evidence' && f.incorrect === 0 && f.independent === 0,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Final answer count' })).toContainText(
    '0 wrong · 30 unsure',
  );
  await page.getByText('Review your submitted evidence & explanations', { exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'Choose a question to review' }).getByRole('button'),
  ).toHaveCount(30);
  await expect(page.locator('[data-result="unsure"]')).toHaveCount(31);
  await expect(page.getByRole('heading', { name: 'Correct answer', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('region', { name: 'Final answer count' })
    .screenshot({
      path: 'test-results/hybrid-v41-unsure-score-desktop.png',
      animations: 'disabled',
    });
  await page
    .locator('article')
    .first()
    .screenshot({ path: 'test-results/hybrid-v41-competency-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-result="unsure"]').last().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .locator('article')
    .last()
    .screenshot({
      path: 'test-results/hybrid-v41-unsure-review-mobile.png',
      animations: 'disabled',
    });
});
