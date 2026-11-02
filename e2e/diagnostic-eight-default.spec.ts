import { test, expect } from '@playwright/test';
import { diagnosticPresentations } from '../src/lib/diagnostic/presentation';
test('explicit local default shows eight distinct competencies and preserves old six-area attempts', async ({
  page,
}) => {
  test.skip(
    process.env.DIAGNOSTIC_STARTER_V3_DEFAULT !== 'true',
    'Requires explicitly configured local eight-area default.',
  );
  await page.goto('/diagnostic-v2');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole('complementary', { name: 'Eight competencies explored in this diagnostic' }),
  ).toBeVisible();
  for (const name of diagnosticPresentations.starter.competencies)
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('24–30');
  await page.screenshot({
    path: 'test-results/eight-area-local-default-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByLabel('What should we call you?').fill('Eight-area default QA');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const read = async () => (await (await page.request.get('/api/diagnostic-v2')).json()).run;
  const eight = await read();
  expect(eight.competencies).toHaveLength(8);
  expect(eight.minimum).toBe(24);
  await page.reload();
  await expect(
    page.getByRole('complementary', { name: 'Eight competencies explored in this diagnostic' }),
  ).toBeVisible();
  expect((await read()).id).toBe(eight.id);
  const origin = new URL(page.url()).origin;
  const result = await page.request.post('/api/diagnostic-v2', {
    headers: { Origin: origin },
    data: { action: 'start', preview: false },
  });
  expect(result.ok()).toBe(true);
  const six = (await result.json()).run;
  expect(six.competencies).toHaveLength(6);
  await page.goto(`/diagnostic-v2?run=${six.id}`);
  await expect(
    page.getByRole('complementary', { name: 'Six competencies explored in this diagnostic' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'This saved attempt keeps its original 6 competencies. A new diagnostic uses 8 competencies.',
    ),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('18–30');
  await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const stored = (await (await page.request.get(`/api/diagnostic-v2?run=${six.id}`)).json()).run;
  expect(stored.competencies).toHaveLength(6);
  expect(stored.id).toBe(six.id);
  await page.goto('/diagnostic-v2');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
  await expect(page.getByText('My learning map · eight core areas', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/eight-area-local-default-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});
