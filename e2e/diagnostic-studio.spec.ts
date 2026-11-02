import { test, expect } from '@playwright/test';
import { db } from '../src/lib/db';

test('studio keeps reading, answering and navigation usable at desktop and narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/diagnostic-v2');
  await page.getByLabel('What should we call you?').fill('Studio layout QA');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  const submit = page.getByRole('button', { name: 'Submit response', exact: true });
  await expect(submit).toBeVisible();
  const fixture = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
  await db.diagnosticRun.update({
    where: { id: fixture.id },
    data: {
      currentQuestionId: 'review2-values-parallel-loop-boundary',
      currentRationale: 'Disposable split-layout compatibility fixture',
    },
  });
  await page.reload();
  await page.getByRole('button', { name: 'Resume diagnostic' }).click();
  const scenario = page.getByText('THE SCENARIO', { exact: false });
  const move = page.getByText('YOUR MOVE', { exact: false });
  const answer = page.getByLabel('Your answer', { exact: true });
  await answer.fill('unsure');
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const left = (await scenario.boundingBox())!;
    const right = (await move.boundingBox())!;
    if (width === 1440) {
      expect(right.x).toBeGreaterThan(left.x + 100);
      expect(Math.abs(left.y - right.y)).toBeLessThan(2);
    } else expect(right.y).toBeGreaterThan(left.y);
    if (width <= 760) {
      const summary = page.getByText('My learning map · six core areas', { exact: true });
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[aria-current="step"]:visible')).toHaveCount(1);
      await page.keyboard.press('Enter');
      await expect(page.locator('[aria-current="step"]:visible')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await answer.scrollIntoViewIfNeeded();
    await answer.focus();
    await expect(answer).toBeFocused();
    await submit.scrollIntoViewIfNeeded();
    // The input and submit never overlap, even when the page needs scrolling.
    const inputBox = (await answer.boundingBox())!,
      buttonBox = (await submit.boundingBox())!;
    expect(buttonBox.y).toBeGreaterThan(inputBox.y + inputBox.height);
    await page.screenshot({
      path: `test-results/studio-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.reload();
  await page.getByRole('button', { name: 'Resume diagnostic' }).click();
  await expect(answer).toHaveValue('unsure');
});
