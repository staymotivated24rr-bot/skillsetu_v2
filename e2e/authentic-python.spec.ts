import { expect, test, type Page } from '@playwright/test';
import { pythonBanks, pythonRepairs } from '../src/lib/authentic/python-banks';
import { correctPayload, solution } from '../tests/authentic-fixtures';
import { writeFileSync } from 'node:fs';
import { explainChange } from '../src/lib/authentic/planning';
import { planGaps, readiness } from '../src/lib/engine';
import type { AuthenticTask } from '../src/lib/authentic/types';
import type { DemoState } from '../src/lib/types';
async function state(page: Page): Promise<DemoState> {
  return (await page.request.get('/api/demo')).json();
}
async function capture(page: Page, name: string) {
  await page.screenshot({ path: `test-results/authentic-${name}.png`, fullPage: true });
}
async function respond(page: Page, task: AuthenticTask, good: boolean, refreshCode = false) {
  if (task.cases) {
    const code = good ? solution(task) : 'def solve(*args):\n    return {"unverified": True}';
    await page.getByLabel('Python code', { exact: true }).fill(code);
    if (refreshCode) {
      await page.reload();
      await expect(page.getByLabel('Python code', { exact: true })).toHaveValue(code);
    }
    await page.getByRole('button', { name: 'Run Python', exact: true }).click();
    await expect(
      page.getByText(
        `${good ? task.cases.length : 0} / ${task.cases.length} evaluation cases passed`,
        { exact: true },
      ),
    ).toBeVisible({ timeout: 60000 });
  } else if (task.options)
    await page
      .getByRole('radio')
      .nth(good ? task.correct! : (task.correct! + 1) % task.options.length)
      .check();
  else if (task.steps) {
    if (good)
      for (let desired = 0; desired < task.order!.length; desired++) {
        const target = task.steps.find((s) => s.id === task.order![desired])!.text;
        let position = await page
          .locator('.ordered-list li')
          .evaluateAll(
            (els, text) => els.findIndex((el) => el.textContent?.includes(text as string)),
            target,
          );
        while (position > desired) {
          await page
            .getByRole('button', { name: `Move step ${position + 1} up`, exact: true })
            .click();
          position--;
        }
      }
  } else
    await page
      .getByLabel('Your explanation', { exact: true })
      .fill(good ? correctPayload(task).text! : 'I am not sure.');
  await page.getByRole('button', { name: 'Send response', exact: true }).click();
}
async function runBank(page: Page, kind: 'diagnostic' | 'reassessment', ratio: number) {
  await expect(
    page.getByRole('heading', { name: 'Show how you work.', exact: true }),
  ).toBeVisible();
  const current = await state(page);
  const attempt = current.attempts.find((a) => a.status === 'in_progress')!;
  const bank = pythonBanks.find((b) => b.id === attempt.bankId)!;
  const captured = new Set<string>();
  for (const [i, task] of bank.tasks.entries()) {
    await expect(page.getByRole('heading', { name: task.prompt, exact: true })).toBeVisible();
    if (task.rubric && !captured.has('short-answer')) {
      await capture(page, kind + '-short-answer');
      captured.add('short-answer');
    }
    if (task.steps && !captured.has('ordered-steps')) {
      await capture(page, kind + '-ordered-steps');
      captured.add('ordered-steps');
    }
    const good = (i + (kind === 'diagnostic' ? 5 : 3)) % 10 < ratio;
    await respond(page, task, good, kind === 'diagnostic' && i === 17);
    await expect(
      page.getByRole('button', { name: 'Continue workplace task', exact: true }),
    ).toBeVisible();
    if (i === 0) await capture(page, kind + '-stakeholder');
    await page.getByRole('button', { name: 'Continue workplace task', exact: true }).click();
    if (i === 3 && kind === 'diagnostic') {
      await page.reload();
      const selector = page.getByLabel('Target role', { exact: true });
      await selector.selectOption('java-developer');
      await expect(selector).toBeEnabled();
      await expect(selector).toHaveValue('java-developer');
      expect((await state(page)).attempts).toHaveLength(0);
      await selector.selectOption('python-developer');
      await expect(selector).toBeEnabled();
      await expect(selector).toHaveValue('python-developer');
      await page.getByRole('button', { name: 'Resume workplace diagnostic', exact: true }).click();
    }
    if (i === 16) await capture(page, kind + '-code');

    if (i === 50) await capture(page, kind + '-transfer');
  }
  await page.getByRole('button', { name: 'Submit assessment', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Now you know where to focus.', exact: true }),
  ).toBeVisible();
  return bank.id;
}
test('Python mixed baseline → deeper honest repair → fresh transfer reassessment → evidence report and responsive dark UI', async ({
  page,
}) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const unexpected: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) unexpected.push(`${r.status()} ${r.url()}`);
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await capture(page, 'landing');
  await page.getByRole('button', { name: 'Find my skill gaps', exact: true }).click();
  await page.locator('.role-choice').filter({ hasText: 'Python Developer' }).click();
  await capture(page, 'onboarding');
  await page.getByLabel('What should we call you?').fill('Evidence learner');
  await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome, Evidence learner.', exact: true }),
  ).toBeVisible();
  await capture(page, 'workspace');
  await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
  await capture(page, 'diagnostic');
  const baselineBank = await runBank(page, 'diagnostic', 6);
  const baseline = await state(page);
  const first = baseline.attempts[0];
  expect(first.score).toBeGreaterThanOrEqual(45);
  expect(first.score).toBeLessThanOrEqual(60);
  expect(first.evidence).toHaveLength(68);
  const gaps = planGaps(first.scores, baseline.skills);
  expect(gaps.length).toBeGreaterThan(0);
  expect(gaps.every((g) => g.current < g.target)).toBe(true);
  await expect(page.getByText('Stronger evidence', { exact: true }).first()).toBeVisible();
  await capture(page, 'skill-map');
  // Raw task success and role-weighted proficiency are separate quantities, even when rounding can coincide.
  const raw = (100 * first.evidence!.filter((e) => e.score >= 0.75).length) / 68;
  expect(readiness(first.scores, baseline.skills)).toBe(first.score);
  expect(Math.abs(raw - first.score!)).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Learning plan', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your 7-day repair plan', exact: true }),
  ).toBeVisible();
  await capture(page, 'learning-plan');
  await page.getByRole('button', { name: 'Start learning', exact: true }).first().click();
  const repair = pythonRepairs.find((m) => m.skillId === gaps[0].id)!;
  await page.getByRole('button', { name: 'Structured', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Worked example', exact: true })).toBeVisible();
  await capture(page, 'structured-lesson');
  await page.getByRole('button', { name: 'Interactive', exact: true }).click();
  await page.getByRole('button', { name: 'Need a hint?', exact: true }).click();
  await expect(page.locator('.hint')).toBeVisible();
  await capture(page, 'interactive-lesson');
  for (const [i, task] of repair.tasks.entries()) {
    if (i === 0) {
      await respond(page, task, false);
      await expect(
        page.getByRole('button', { name: 'Next practice task', exact: true }),
      ).toBeVisible();
    }
    await respond(page, task, true, i === 2 && !!task.cases);
    await expect(
      page.getByRole('button', { name: 'Next practice task', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next practice task', exact: true }).click();
  }
  await expect(
    page.getByRole('heading', { name: 'You demonstrated this lesson’s objectives.', exact: true }),
  ).toBeVisible();
  expect((await state(page)).attempts[0].score).toBe(first.score);
  expect((await state(page)).repairProgress![0].status).toBe('mastered');
  await page.getByRole('button', { name: 'Verify in a fresh case', exact: true }).click();
  const reassessmentBank = await runBank(page, 'reassessment', 7);
  expect(reassessmentBank).not.toBe(baselineBank);
  const after = await state(page);
  const latest = after.attempts.at(-1)!;
  expect(latest.score).toBeGreaterThanOrEqual(60);
  expect(latest.score).toBeLessThanOrEqual(80);
  const comparison = explainChange(first.scores, latest.scores, after.skills);
  expect(comparison.improved.length).toBeGreaterThan(0);
  expect(comparison.declined.length).toBeGreaterThan(0);
  expect(comparison.newGaps.length).toBeGreaterThan(0);
  expect(comparison.newlyMeasured).toHaveLength(after.skills.length);
  writeFileSync(
    'test-results/authentic-acceptance.json',
    JSON.stringify(
      {
        baseline: first.score,
        reassessment: latest.score,
        baselineBank,
        reassessmentBank,
        improved: comparison.improved.length,
        declined: comparison.declined.length,
        unchanged: comparison.unchanged.length,
        newGaps: comparison.newGaps.map((s) => s.name),
        baselineGapCount: gaps.length,
        reassessmentGapCount: planGaps(latest.scores, after.skills).length,
        evidencePerAttempt: latest.evidence!.length,
        practiceChangedReadiness: false,
      },
      null,
      2,
    ),
  );
  await expect(
    page.getByRole('heading', { name: 'Why did my result change?', exact: true }),
  ).toBeVisible();
  await capture(page, 'reassessment');
  await page.getByRole('button', { name: 'Readiness report', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'What this result does not prove', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Transfer evidence:/).first()).toBeVisible();
  await page.getByLabel('Assessment report', { exact: true }).selectOption(first.id);
  await expect(page.getByLabel('Assessment report', { exact: true })).toHaveValue(first.id);
  await expect(
    page.getByLabel('Assessment report', { exact: true }).locator('option:checked'),
  ).toContainText(baselineBank);
  await page.getByLabel('Assessment report', { exact: true }).selectOption(latest.id);
  await capture(page, 'readiness-report');
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
      'dark',
    );
    await capture(page, 'report-' + width);
  }
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'My workspace', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.sidebar')).toBeHidden();
  expect(
    await page
      .locator('th')
      .evaluateAll((headers) =>
        headers.every((header) => header.scrollWidth <= header.clientWidth + 1),
      ),
  ).toBe(true);
  const printBadgeContrasts = await page.locator('.badge-green').evaluateAll((badges) => {
    const luminance = (color: string) => {
      const components = color
        .match(/\d+(?:\.\d+)?/g)!
        .slice(0, 3)
        .map(Number)
        .map((v) => v / 255);
      const linear = components.map((v) =>
        v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
      );
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    return badges.map((badge) => {
      const style = getComputedStyle(badge);
      const foreground = luminance(style.color),
        background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
  });
  expect(printBadgeContrasts.length).toBeGreaterThan(0);
  expect(printBadgeContrasts.every((contrast) => contrast >= 4.5)).toBe(true);
  await page.pdf({
    path: 'test-results/authentic-readiness-report.pdf',
    format: 'A4',
    printBackground: true,
  });
  await capture(page, 'print-report');
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Placement dashboard', exact: true }).click();
  for (const role of ['data-analyst', 'python-developer', 'java-developer']) {
    await page.getByLabel('Cohort role', { exact: true }).selectOption(role);
    await expect(page.getByText('Fictional seeded data', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Cohort evidence and next actions', exact: true }),
    ).toBeVisible();
    await capture(page, 'cohort-' + role);
  }
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
