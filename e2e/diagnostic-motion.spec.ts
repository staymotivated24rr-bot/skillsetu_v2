import { test, expect } from '@playwright/test';
import { blockDiagnostic as bank } from '../src/lib/diagnostic/block-bank';
import { chooseBlocks } from './helpers/diagnostic-blocks';
test.use({ video: 'on' });
for (const mobile of [false, true])
  test(`animated lesson and direct next question (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/diagnostic-v2');
    await page.screenshot({
      path: `test-results/motion-intro-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    const body = page.locator('[data-mood="thinking"] svg > g').first();
    await expect(body).toBeVisible();
    expect(await body.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
    const initialTransform = await body.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(180);
    expect(await body.evaluate((el) => getComputedStyle(el).transform)).not.toBe(initialTransform);
    await page.getByLabel('What should we call you?').fill('Motion QA');
    await page.getByRole('button', { name: 'Explore my Python skills' }).click();
    await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
    const before = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
    const q = bank.questions.find((q) => q.id === before.current.id)!;
    expect(q.codeSlots).toBeDefined();
    await chooseBlocks(page, q);
    await page.screenshot({
      path: `test-results/motion-question-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/diagnostic-v2') &&
        r.request().method() === 'POST' &&
        r.request().postDataJSON()?.action === 'answer',
    );
    await page.getByRole('button', { name: 'Submit response', exact: true }).click();
    const next = (await (await response).json()).run;
    await expect(
      page.getByRole('heading', { name: next.current.title, exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-outcome="saved"]')).toHaveCount(0);
    const after = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
    expect(after.answered).toBe(1);
    expect(after.report).toBeNull();
    expect(after.lastFeedback.assisted).toBe(false);
    expect(after.lastFeedback).not.toHaveProperty('correct');
    await expect(page.locator('[data-mood="matched"]')).toHaveCount(0);
    await page.screenshot({
      path: `test-results/motion-next-question-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await body.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
