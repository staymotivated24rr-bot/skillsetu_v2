import { expect, test } from '@playwright/test';
import { pythonBanks } from '../src/lib/authentic/python-banks';
import { correctPayload, solution } from '../tests/authentic-fixtures';
test('mobile Python workspace, keyboard decision, saved draft and intentional coding guidance', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Find my skill gaps', exact: true }).click();
  await page.locator('.role-choice').filter({ hasText: 'Python Developer' }).click();
  await page.getByLabel('What should we call you?').fill('Mobile evidence learner');
  await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome, Mobile evidence learner.', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/authentic-mobile-workspace.png', fullPage: true });
  await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Show how you work.', exact: true }),
  ).toBeVisible();
  await page.getByRole('radio').first().focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio').first()).toBeChecked();
  await page.screenshot({ path: 'test-results/authentic-mobile-assessment.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const state = await (await page.request.get('/api/demo')).json();
  const attempt = state.attempts[0];
  const bank = pythonBanks.find((b) => b.id === attempt.bankId)!;
  // Advance authored decisions through the same API; coding is still executed only in-browser.
  for (const task of bank.tasks.slice(0, 17))
    expect(
      (
        await page.request.post('/api/demo', {
          data: {
            action: 'task',
            attemptId: attempt.id,
            taskId: task.id,
            payload: correctPayload(task),
          },
        })
      ).ok(),
    ).toBe(true);
  await page.reload();
  await expect(
    page.getByText('This coding task is best completed on a larger screen.', { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel('Python code', { exact: true })
    .fill('def solve(value):\n    # draft saved for desktop\n    return None');
  await page.reload();
  await expect(page.getByLabel('Python code', { exact: true })).toHaveValue(
    /draft saved for desktop/,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/authentic-mobile-code-guidance.png',
    fullPage: true,
  });
  await page.getByLabel('Python code', { exact: true }).fill('while True:\n    pass');
  await page.getByRole('button', { name: 'Run Python', exact: true }).click();
  await expect(page.getByText(/Execution timed out after 5 seconds/)).toBeVisible({
    timeout: 60000,
  });
  await page.getByLabel('Python code', { exact: true }).fill(solution(bank.tasks[17]));
  await page.getByRole('button', { name: 'Run Python', exact: true }).click();
  await expect(
    page.getByText(
      `${bank.tasks[17].cases!.length} / ${bank.tasks[17].cases!.length} evaluation cases passed`,
      { exact: true },
    ),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
});
