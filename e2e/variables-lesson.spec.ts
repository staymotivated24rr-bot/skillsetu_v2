import { expect, test } from '@playwright/test';
for (const width of [1440, 390, 320]) {
  test(`complete variables lesson, first-attempt mastery and fresh run at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/diagnostic-v2/learn/variables');
    await page.getByLabel('Your practice name').fill(`Variables synthetic ${width}`);
    await page.getByRole('button', { name: 'Begin the lesson', exact: true }).click();
    const read = async () =>
      (
        await (
          await page.request.get('/api/diagnostic-v2/learning?lesson=python-variables-references')
        ).json()
      ).run;
    const fit = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    const next = async () => {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await fit();
    };
    const check = async () => {
      await page.getByRole('button', { name: /^Check (answer|again)$/ }).click();
    };
    await expect(
      page.getByRole('heading', { name: 'A name is a label, not a box', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
    await page.getByRole('checkbox').check();
    await check();
    await next();
    await page.getByLabel('Predicted output (integer)').fill('19');
    await check();
    await expect(page.getByText('Not correct yet', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Need a hint?', exact: true }).click();
    await page.getByLabel('Predicted output (integer)').fill('12');
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByRole('button', { name: 'Next statement', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Next statement', exact: true }).click();
    await expect(
      page.getByText('basket is rebound to a different list, B. saved still refers to A.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(async () => (await read()).drafts['vr-map']?.frame).toBe(2);
    await page.reload();
    await expect(
      page.getByText('basket is rebound to a different list, B. saved still refers to A.', {
        exact: true,
      }),
    ).toBeVisible();
    const objects = page.locator('[class*="objectCard"]');
    await expect(objects.first()).toHaveCSS('animation-name', 'none');
    await page.screenshot({
      path: `test-results/variables-map-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Previous statement', exact: true }).click();
    await page.getByRole('button', { name: 'Next statement', exact: true }).click();
    await page.getByRole('checkbox').check();
    await check();
    await next();
    await page.getByRole('radio').nth(0).check();
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByRole('button', { name: 'stock.copy()', exact: true }).focus();
    await page.keyboard.press('Enter');
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByLabel('Predicted output (integer)').fill('11');
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByLabel('Predicted output (Python literal)').fill('[2,5]');
    await expect.poll(async () => (await read()).drafts['vr-copy-output']?.text).toBe('[2,5]');
    await page.reload();
    await expect(page.getByLabel('Predicted output (Python literal)')).toHaveValue('[2,5]');
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByLabel('Predicted output (text, no quotes)').fill('oak');
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByLabel('Final first', { exact: true }).fill('[4, 7]');
    await page.getByLabel('Final second', { exact: true }).fill('[4, 6]');
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByRole('radio').nth(1).check();
    await check();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await next();
    await page.getByRole('checkbox').check();
    await check();
    await next();
    await expect(page.getByRole('button', { name: 'Need a hint?', exact: true })).toHaveCount(0);
    const before = await read();
    expect(before.mastery.independentCorrect).toBe(4);
    expect(before.mastery.status).toBe('awaiting-check');
    expect(JSON.stringify(before.lesson)).not.toContain('"masteryVariants":');
    await page.getByLabel('Final check: a', { exact: true }).fill('[9]');
    await page.getByLabel('Final check: b', { exact: true }).fill('[5,2]');
    await page.getByLabel('Final check: a is b', { exact: true }).fill('False');
    await check();
    await expect(
      page.getByRole('heading', { name: 'Lesson mastery demonstrated', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lesson complete', exact: true })).toBeVisible();
    expect((await read()).mastery.finalPassed).toBe(true);
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '12');
    await fit();
    await page.screenshot({
      path: `test-results/variables-mastery-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    const review = page.getByRole('region', { name: 'Learning review' });
    await review.getByText(/Rebinding moves one label · first attempt missed/).click();
    await expect(review.getByText('19', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Your reference-model checklist', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Lesson mastery demonstrated', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'New practice run', exact: true }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
    const second = await read();
    expect(second.ordinal).toBe(2);
    expect(second.id).not.toBe(before.id);
    expect(second.lesson.steps.at(-1).code).not.toBe(before.lesson.steps.at(-1).code);
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
    expect(errors).toEqual([]);
  });
}
