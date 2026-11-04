import { test, expect } from '@playwright/test';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import { publicQuestion, makeReport } from '../src/lib/diagnostic/engine';
import { optionPresentation } from '../src/lib/diagnostic/option-presentation';
import type { RunView } from '../src/lib/diagnostic/types';

// UI fixtures deliberately contain public projections only. Real persistence is covered
// separately by diagnostic-starter/hybrid/review service and browser journeys.
function fixture(index: number, question: RunView['current']): RunView {
  return {
    id: 'synthetic-render-audit',
    bankId: bank.id,
    status: 'active',
    role: bank.roleName,
    answered: index,
    minimum: 24,
    target: 24,
    maximum: 360,
    competencies: bank.competencies.map((c) => ({ id: c.id, name: c.name, count: index ? 1 : 0 })),
    current: question,
    rationale: 'Synthetic presentation fixture',
    hint: null,
    draft: {},
    lastFeedback: null,
    report: null,
    review: null,
  };
}

for (const width of [1440, 390]) {
  test(`completed Q10 review distinguishes saved whitespace from the correct answer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const q = bank.questions.find((q) => q.id === 'SS-PY-0297')!;
    const selected = q.options!.findIndex((text) => text.startsWith(' '));
    expect(selected).not.toBe(q.correct);
    const report = makeReport(
      bank,
      [
        {
          questionId: q.id,
          correct: false,
          assisted: false,
          payload: JSON.stringify({ selected }),
        },
      ],
      'Synthetic completed review',
    );
    const run: RunView = {
      ...fixture(1, null),
      status: 'completed',
      report,
      review: [
        {
          ...report.evidence[0],
          question: publicQuestion(q),
          answer: { selected },
          correctAnswer: { kind: 'option', index: q.correct!, text: q.options![q.correct!] },
        },
      ],
    };
    await page.route('**/api/diagnostic-v2*', (route) =>
      route.fulfill({ json: { session: true, run } }),
    );
    await page.goto('/diagnostic-v2?preview=starter-v3');
    await page.getByText('Review your submitted evidence & explanations', { exact: true }).click();
    const article = page
      .getByRole('region', { name: 'Final question review' })
      .getByRole('article');
    await expect(article.locator('li[data-selected="true"] code')).toHaveText('␠␠python␠5␠␠');
    await expect(article.locator('li[data-expected="true"] code')).toHaveText('python 5');
    await expect(article.getByRole('region', { name: 'Your saved answer' })).toContainText(
      '[space]',
    );
    await expect(page.getByRole('main')).toContainText('1 response across 8 competencies');
    await expect(page.getByRole('main')).not.toContainText('1 responses');
    await article.screenshot({ path: `test-results/review-whitespace-${width}.png` });
  });
  test(`all 864 presented MCQ choices remain distinct at ${width}px`, async ({ page }) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width, height: 1000 });
    const questions = bank.questions.filter((q) => q.options);
    let index = 0;
    await page.route('**/api/diagnostic-v2*', async (route) => {
      const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (body?.action === 'answer') index++;
      await route.fulfill({
        json: { session: true, run: fixture(index, publicQuestion(questions[index])) },
      });
    });
    await page.goto('/diagnostic-v2?preview=starter-v3');
    await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await expect(page.getByRole('heading', { name: q.title, exact: true })).toBeVisible();
      const codes = page.locator('fieldset code');
      await expect(codes).toHaveCount(4);
      const displayed = await codes.allTextContents();
      expect(displayed, q.id).toEqual(q.options!.map((s) => optionPresentation(s).visible));
      expect(new Set(displayed.map((s) => s.replace(/\s+/g, ' ').trim())).size, q.id).toBe(4);
      const radios = page.getByRole('radio');
      const names = await radios.evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
      expect(new Set(names).size, q.id).toBe(4);
      for (let j = 0; j < 4; j++) {
        await expect(radios.nth(j)).toHaveAccessibleName(
          optionPresentation(q.options![j]).accessible,
        );
        await expect(codes.nth(j)).toHaveCSS('white-space', 'break-spaces');
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        q.id,
      ).toBe(true);
      if (/^SS-PY-029[5-7]$/.test(q.id) || q.options!.some((s) => s.includes('cleanup\n')))
        await page.screenshot({
          path: `test-results/presentation-${q.id}-${width}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      if (i < questions.length - 1) {
        await radios.nth(0).check();
        await page.getByRole('button', { name: 'Submit response', exact: true }).click();
        await expect(page.getByRole('progressbar')).toHaveAttribute('value', String(i + 1));
      }
    }
  });

  test(`numeric errors are inline, visible, preserve drafts and never submit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const questions = [
      bank.questions.find((q) => q.numeric?.kind === 'integer')!,
      bank.questions.find((q) => q.numeric?.kind === 'float' && q.numeric.places === 2)!,
    ];
    let index = 0,
      submissions = 0,
      draft = {};
    await page.route('**/api/diagnostic-v2*', async (route) => {
      const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      if (body?.action === 'draft') draft = body.answer;
      if (body?.action === 'answer') {
        submissions++;
        index++;
        draft = {};
      }
      await route.fulfill({
        json: {
          session: true,
          run: { ...fixture(index, publicQuestion(questions[index])), draft },
        },
      });
    });
    await page.goto('/diagnostic-v2?preview=starter-v3');
    await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
    const field = page.locator('#diagnostic-answer');
    for (const invalid of ['6.0', '4.7']) {
      const before = submissions;
      await field.fill(invalid);
      await page.getByRole('button', { name: 'Submit response', exact: true }).click();
      const error = page.locator('#diagnostic-format-error');
      await expect(error).toContainText('does not count as a response');
      await expect(field).toHaveValue(invalid);
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toBeFocused();
      await expect(page.getByRole('button', { name: 'Reconnect & resume' })).toHaveCount(0);
      const box = await error.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
      expect(submissions).toBe(before);
      await page.screenshot({
        path: `test-results/numeric-inline-${index}-${width}.png`,
        fullPage: false,
      });
      await expect(page.getByText('Draft saved to your session.', { exact: true })).toBeVisible();
      await page.reload();
      await page.getByRole('button', { name: 'Resume diagnostic', exact: true }).click();
      await expect(field).toHaveValue(invalid);
      if (index === 0) {
        await field.fill(questions[0].numeric!.expected);
        await page.getByRole('button', { name: 'Submit response', exact: true }).click();
        await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1');
        await expect(page.locator('aside[aria-label="Discovery journey"]')).toContainText(
          '1 response',
        );
        await expect(page.locator('aside[aria-label="Discovery journey"]')).not.toContainText(
          '1 responses',
        );
      }
    }
    expect(submissions).toBe(1);
  });
}

test('binary-search recommendation teaches logarithmic halving with a targeted transfer check', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2/learn?skill=starter-dsa&subskill=Algorithmic%20complexity');
  await expect(
    page.getByRole('heading', { name: 'Why binary search takes O(log n)', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('Graph weighting');
  await page
    .getByRole('textbox')
    .fill('Halve the sorted range; an empty input needs no comparisons.');
  await page.getByRole('button', { name: 'Compare with the worked example' }).click();
  await expect(page.getByRole('main')).toContainText('128 → 64 → 32');
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Check my reasoning' }).click();
  await expect(page.getByRole('main')).toContainText('O(log n)');
  await expect(page.getByRole('main')).toContainText('Trace a missing target in 32 sorted values');
  await page.screenshot({ path: 'test-results/binary-search-repair.png', fullPage: true });
});
