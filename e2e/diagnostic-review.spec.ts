import { test, expect } from '@playwright/test';
import { blockDiagnostic as bank } from '../src/lib/diagnostic/block-bank';
import type { Answer, RunView } from '../src/lib/diagnostic/types';
import { optionPresentation } from '../src/lib/diagnostic/option-presentation';

test('final score and individual review show every full question and the learner saved answer on desktop/mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/diagnostic-v2?preview=legacy');
  await page.getByLabel('What should we call you?').fill('Final report review QA');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/preview=legacy/);
  const origin = new URL(page.url()).origin;
  let run: RunView = (await (await page.request.get('/api/diagnostic-v2?preview=legacy')).json())
    .run;
  const recorded: { id: string; answer: Answer }[] = [];
  await expect(page.getByRole('region', { name: 'Final answer count' })).toHaveCount(0);
  while (run.current) {
    expect(run.review).toBeNull();
    expect(run.current).not.toHaveProperty('correctAnswer');
    expect(run.report).toBeNull();
    expect(run.lastFeedback ?? {}).not.toHaveProperty('correct');
    const q = bank.questions.find((q) => q.id === run.current!.id)!,
      correct = recorded.length % 3 !== 0;
    const answer: Answer = q.codeSlots
      ? {
          blocks: {
            ...q.blockKey,
            ...(!correct
              ? {
                  [q.codeSlots[0].id]: q.codeSlots[0].choices.find(
                    (c) => c.id !== q.blockKey![q.codeSlots![0].id],
                  )!.id,
                }
              : {}),
          },
        }
      : q.options
        ? { selected: correct ? q.correct! : (q.correct! + 1) % q.options.length }
        : q.steps
          ? { order: correct ? q.order : [...q.order!].reverse() }
          : { text: correct ? q.expected![0] : 'unsure' };
    if (recorded.length === 1) {
      const hint = await page.request.post('/api/diagnostic-v2', {
        headers: { Origin: origin },
        data: { action: 'hint', runId: run.id, questionId: q.id },
      });
      expect(hint.ok()).toBe(true);
    }
    const response = await page.request.post('/api/diagnostic-v2', {
      headers: { Origin: origin },
      data: { action: 'answer', runId: run.id, questionId: q.id, answer },
    });
    expect(response.ok()).toBe(true);
    run = (await response.json()).run;
    recorded.push({ id: q.id, answer });
    expect(recorded.length).toBeLessThanOrEqual(30);
  }
  const sealed = JSON.stringify(run.report);
  expect(run.review).toHaveLength(recorded.length);
  expect(
    new Set(
      run.review!.map((e) =>
        e.question?.codeSlots
          ? 'blocks'
          : e.question?.options
            ? 'options'
            : e.question?.steps
              ? 'ordering'
              : 'text',
      ),
    ),
  ).toEqual(new Set(['blocks', 'options', 'ordering', 'text']));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
  const count = run.report!.evidence.filter((e) => e.correct).length;
  await expect(page.getByRole('region', { name: 'Final answer count' })).toContainText(
    new RegExp(`${count}\\s*/\\s*${run.answered}\\s*correct`),
  );
  const assisted = run.report!.evidence.filter((e) => e.correct && e.assisted).length;
  expect(assisted).toBeGreaterThan(0);
  await expect(page.getByText(`${assisted} correct with a hint`, { exact: true })).toBeVisible();
  await page
    .getByRole('region', { name: 'Final answer count' })
    .screenshot({ path: 'test-results/final-review-score-card.png' });
  await page.screenshot({
    path: 'test-results/final-review-score.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByText('Review your submitted evidence & explanations', { exact: true }).click();
  const region = page.getByRole('region', { name: 'Final question review' });
  await expect(
    region.getByRole('button', { name: 'Previous review question', exact: true }),
  ).toBeDisabled();
  for (const [i, entry] of run.review!.entries()) {
    await region
      .getByRole('button', { name: new RegExp('^Review question ' + (i + 1) + ':') })
      .click();
    const article = region.getByRole('article');
    await expect(article.getByRole('heading', { level: 3 })).toHaveText(`${i + 1}. ${entry.title}`);
    await expect(article.getByText(entry.question!.prompt, { exact: true })).toBeVisible();
    await expect(
      article.getByText(entry.correct ? 'Correct' : 'Wrong', { exact: true }),
    ).toBeVisible();
    await expect(article.getByText(entry.explanation, { exact: true })).toBeVisible();
    const saved = article.getByRole('region', { name: 'Your saved answer' }),
      answer = recorded[i].answer,
      q = entry.question!;
    expect(entry.answer).toEqual(answer);
    for (const key of [
      'blockKey',
      'expected',
      'correct',
      'contract',
      'order',
      'explanation',
      'hint',
    ])
      expect(q).not.toHaveProperty(key);
    if (answer.text?.toLowerCase() === 'unsure')
      await expect(saved.getByText('Unsure', { exact: true })).toBeVisible();
    else if (q.codeSlots) {
      await expect(saved.locator('dd')).toHaveText(
        q.codeSlots.map((s) => s.choices.find((c) => c.id === answer.blocks![s.id])!.code),
      );
      await expect(saved.getByLabel('Your submitted code', { exact: true })).toBeVisible();
    } else if (q.options) {
      await expect(saved).toContainText(q.options[answer.selected!]);
      await expect(article.locator('li[data-selected="true"]')).toHaveCount(1);
    } else if (q.steps)
      await expect(
        saved.getByRole('list', { name: 'Your selected step order' }).getByRole('listitem'),
      ).toHaveText(answer.order!.map((id) => q.steps!.find((s) => s.id === id)!.text));
    else await expect(saved).toContainText(answer.text!);
    const correctRegion = article.getByRole('region', { name: 'Correct answer' });
    await expect(correctRegion).toBeVisible();
    const authored = bank.questions.find((q) => q.id === entry.questionId)!;
    expect(entry.correctAnswer).not.toBeNull();
    if (authored.codeSlots) {
      await expect(correctRegion.locator('dd')).toHaveText(
        authored.codeSlots.map(
          (s) => s.choices.find((c) => c.id === authored.blockKey![s.id])!.code,
        ),
      );
      await expect(
        correctRegion.getByLabel('Correct completed code', { exact: true }),
      ).not.toContainText('{{');
      await expect(article.locator('li[data-expected="true"]')).toHaveCount(
        authored.codeSlots.length,
      );
    } else if (authored.options) {
      await expect(
        correctRegion.getByText(`Option ${authored.correct! + 1}:`, { exact: true }),
      ).toBeVisible();
      await expect(correctRegion.locator('code')).toHaveText(
        optionPresentation(authored.options[authored.correct!]).visible,
      );
      await expect(article.locator('li[data-expected="true"]')).toHaveCount(1);
      await expect(article.getByText('Correct option', { exact: true })).toBeVisible();
    } else if (authored.steps) {
      await expect(
        correctRegion.getByRole('list', { name: 'Correct step order' }).getByRole('listitem'),
      ).toHaveText(authored.order!.map((id) => authored.steps!.find((s) => s.id === id)!.text));
    } else
      await expect(correctRegion.getByRole('listitem')).toHaveText([
        ...new Set(authored.contract?.examples ?? authored.expected),
      ]);
    if (i === 0)
      await article.screenshot({ path: 'test-results/final-review-question-desktop.png' });
  }
  await expect(
    region.getByRole('button', { name: 'Next review question', exact: true }),
  ).toBeDisabled();
  await region.getByRole('button', { name: 'Previous review question', exact: true }).click();
  await expect(region.getByRole('status')).toHaveText(
    `Question ${run.answered - 1} of ${run.answered}`,
  );
  await region.getByRole('button', { name: 'Next review question', exact: true }).click();
  const decision = run.review!.findIndex((e) => e.question?.options);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await region
      .getByRole('button', { name: new RegExp('^Review question ' + (decision + 1) + ':') })
      .press('Enter');
    await expect(region.getByRole('heading', { level: 3 })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390)
      await region
        .getByRole('article')
        .screenshot({ path: 'test-results/final-review-question-mobile.png' });
    // Change selection before repeating the keyboard/focus check at the next width.
    await region.getByRole('button', { name: 'Next review question', exact: true }).click();
  }
  await page.reload();
  await expect(page.getByRole('region', { name: 'Final answer count' })).toContainText(
    new RegExp(`${count}\\s*/\\s*${run.answered}\\s*correct`),
  );
  const reopened = (await (await page.request.get('/api/diagnostic-v2?run=' + run.id)).json()).run;
  expect(JSON.stringify(reopened.report)).toBe(sealed);
  expect(reopened.review).toHaveLength(run.answered);
});
