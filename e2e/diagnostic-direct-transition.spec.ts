import { test, expect } from '@playwright/test';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import type { RunView } from '../src/lib/diagnostic/types';
test('every submission immediately opens the next question, and the last opens the report', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2?preview=starter-v3');
  await page.getByLabel('What should we call you?').fill('Direct transition QA');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  let run: RunView = (
    await (await page.request.get('/api/diagnostic-v2?preview=starter-v3')).json()
  ).run;
  let interrupted = false;
  while (run.current) {
    const q = bank.questions.find((q) => q.id === run.current!.id)!;
    if (q.options) await page.getByRole('radio').nth(q.correct!).check();
    else await page.locator('#diagnostic-answer').fill(q.expected![0]);
    const submit = page.getByRole('button', { name: 'Submit response', exact: true });
    if (!interrupted) {
      interrupted = true;
      await page.route('**/api/diagnostic-v2', (route) =>
        route.request().method() === 'POST' && route.request().postDataJSON()?.action === 'answer'
          ? route.abort()
          : route.continue(),
      );
      await submit.click();
      await expect(page.locator('main [role=alert]')).toBeVisible();
      await expect(page.getByRole('heading', { name: q.title, exact: true })).toBeVisible();
      const unchanged = (
        await (await page.request.get('/api/diagnostic-v2?preview=starter-v3')).json()
      ).run;
      expect(unchanged.current.id).toBe(q.id);
      expect(unchanged.answered).toBe(0);
      await page.unroute('**/api/diagnostic-v2');
    }
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/diagnostic-v2') &&
        r.request().method() === 'POST' &&
        r.request().postDataJSON()?.action === 'answer',
    );
    await submit.click();
    const result = await response;
    expect(result.ok()).toBe(true);
    const next: RunView = (await result.json()).run;
    expect(next.answered).toBe(run.answered + 1);
    await expect(page.getByText('Response saved', { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Saved. Keep going at your pace.' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Continue discovery|See my skill map/ }),
    ).toHaveCount(0);
    const heading = page.getByRole('heading', {
      name: next.current?.title ?? 'Evidence into direction.',
      exact: true,
    });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    if (next.current) {
      expect(next.current.id).not.toBe(q.id);
      expect(next.report).toBeNull();
      expect(next.review).toBeNull();
    }
    run = next;
  }
  expect(run.answered).toBe(24);
  await expect(page.getByRole('region', { name: 'Final answer count' })).toContainText('24');
});
