import { test, expect } from '@playwright/test';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import type { Answer, RunView } from '../src/lib/diagnostic/types';
test('local draft journey keeps numeric format separate, resumes and reviews every correct answer', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2?preview=starter-v3');
  await expect(page.getByText(/Development preview · 360/)).toBeVisible();
  await page.getByLabel('What should we call you?').fill('360 browser QA');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const origin = new URL(page.url()).origin;
  let run: RunView = (
    await (await page.request.get('/api/diagnostic-v2?preview=starter-v3')).json()
  ).run;
  let checkedNumeric = false,
    checkedOptions = false;
  while (run.current) {
    const q = bank.questions.find((q) => q.id === run.current!.id)!;
    expect(run.report).toBeNull();
    expect(run.review).toBeNull();
    expect(run.current).not.toHaveProperty('optionHypotheses');
    expect(run.current.numeric ?? {}).not.toHaveProperty('expected');
    const answer: Answer = q.numeric ? { text: q.numeric.expected } : { selected: q.correct };
    if (q.numeric && !checkedNumeric) {
      checkedNumeric = true;
      await page.reload();
      await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
      await expect(page.getByRole('radio')).toHaveCount(0);
      const field = page.locator('#diagnostic-answer');
      await expect(field).toHaveAttribute('type', 'text');
      await expect(page.locator('#diagnostic-numeric-hint')).toContainText(q.numeric.hint);
      await field.fill('3e2');
      await page.getByRole('button', { name: 'Submit response', exact: true }).click();
      await expect(page.locator('main [role=alert]')).toContainText('does not count');
      expect(
        (await (await page.request.get('/api/diagnostic-v2?preview=starter-v3')).json()).run
          .answered,
      ).toBe(run.answered);
      await field.fill(q.numeric.expected);
      await page.waitForTimeout(900);
      await page.reload();
      await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
      await expect(page.locator('#diagnostic-answer')).toHaveValue(q.numeric.expected);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: 'test-results/starter-v3-numeric-mobile.png',
        fullPage: true,
        animations: 'disabled',
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    if (q.options && !checkedOptions) {
      checkedOptions = true;
      await page.reload();
      await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
      await expect(page.getByRole('radio')).toHaveCount(4);
      await page.getByRole('radio').nth(q.correct!).check();
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: 'test-results/starter-v3-mcq-desktop.png',
        fullPage: true,
        animations: 'disabled',
      });
    }
    const result = await page.request.post('/api/diagnostic-v2', {
      headers: { Origin: origin },
      data: { action: 'answer', runId: run.id, questionId: q.id, answer },
    });
    expect(result.ok()).toBe(true);
    run = (await result.json()).run;
  }
  expect(checkedNumeric && checkedOptions).toBe(true);
  expect(run.report!.findings).toHaveLength(8);
  expect(run.review!.every((r) => r.correctAnswer)).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Final answer count' })).toContainText(
    `${run.answered}`,
  );
  await page.getByText('Review your submitted evidence & explanations', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Correct answer', exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/starter-v3-report-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: 'test-results/starter-v3-report-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('summary').filter({ hasText: 'Evidence and next steps' }).first().click();
  const link = page.getByRole('link', { name: 'Explore the SkillSetu module' }).first();
  await link.click();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Guided subskill repair' })).toHaveCount(0);
});
