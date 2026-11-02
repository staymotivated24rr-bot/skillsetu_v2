import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`Python target role opens Diagnostic v2 without changing other roles at ${width}px`, async ({
    page,
  }) => {
    await page.goto('/#workspace');
    await page.getByLabel('What should we call you?').fill('Workspace route synthetic QA');
    await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
    const target = page.getByRole('combobox', { name: 'Target role', exact: true });
    await expect(
      page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }),
    ).toBeVisible();
    await target.selectOption('python-developer');
    await expect(target).toHaveValue('python-developer');
    await expect(target.locator('option[value="python-developer"]')).toHaveText(
      'Python Diagnostic v2',
    );
    await expect(
      page.getByRole('heading', { name: 'Python Diagnostic v2', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.workspace-hero')).toContainText('8 competencies');
    await expect(page.locator('.workspace-hero')).toContainText('24–30 adaptive questions');
    await expect(page.locator('.workspace-hero')).not.toContainText('68 authentic');
    for (const role of ['java-developer', 'data-analyst']) {
      await target.selectOption(role);
      await expect(target).toHaveValue(role);
      await expect(
        page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Open Python Diagnostic v2', exact: true }),
      ).toHaveCount(0);
    }
    await target.selectOption('python-developer');
    await expect(target).toHaveValue('python-developer');
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/python-v2-workspace-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('link', { name: 'Open Python Diagnostic v2', exact: true }).click();
    await expect(page).toHaveURL(/\/diagnostic-v2$/);
    await page.getByLabel('What should we call you?').fill('Workspace v2 synthetic QA');
    await page.getByRole('button', { name: 'Explore my Python skills', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
    const run = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
    expect(run.competencies).toHaveLength(8);
    expect(run.answered).toBe(0);
    await page.goto('/#workspace');
    const workspace = await (await page.request.get('/api/demo')).json();
    expect(workspace.role.id).toBe('python-developer');
    expect(workspace.attempts).toHaveLength(0); // v2 grants no legacy readiness credit
    if (width === 390)
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('button', { name: 'Python Diagnostic v2', exact: true }).click();
    await expect(page).toHaveURL(/\/diagnostic-v2$/);
    await expect(
      page.getByRole('button', { name: 'Resume diagnostic', exact: true }),
    ).toBeVisible();
    expect((await (await page.request.get('/api/diagnostic-v2')).json()).run.id).toBe(run.id);
  });
}
