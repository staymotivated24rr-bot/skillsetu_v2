import { test, expect } from '@playwright/test';
import { db } from '../src/lib/db';
import { reviewedDiagnostic as bank } from '../src/lib/diagnostic/reviewed-bank';
test('original manipulation controls support keyboard, touch and reduced motion in disposable fixtures', async ({
  page,
}) => {
  if (!process.env.DATABASE_URL?.includes('/skillsetu_audit'))
    throw Error('Disposable audit database required');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/diagnostic-v2');
  await page.getByLabel('What should we call you?').fill('Interaction QA fixture');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const run = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
  for (const kind of ['loop-boundary', 'state-cards', 'error-location']) {
    const q = bank.questions.find((q) => q.interaction === kind)!;
    await db.diagnosticRun.update({
      where: { id: run.id },
      data: {
        currentQuestionId: q.id,
        currentRationale: 'Disposable interaction fixture; not learner evidence',
        draft: '{}',
      },
    });
    await page.reload();
    await page.getByRole('button', { name: 'Resume diagnostic' }).click();
    if (kind === 'loop-boundary') {
      await page.getByRole('slider').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('spinbutton')).toHaveValue('4');
    }
    if (kind === 'state-cards') {
      await page.getByRole('button', { name: 'Next statement' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'State card 2' })).toBeVisible();
    }
    if (kind === 'error-location') {
      await page.getByRole('radio').first().check();
      await expect(page.getByRole('status').filter({ hasText: 'Inspecting line 1' })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/audit-${kind}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
});
