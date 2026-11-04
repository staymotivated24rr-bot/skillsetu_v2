import { test, expect } from '@playwright/test';
import { db } from '../src/lib/db';
import { blockDiagnostic as bank } from '../src/lib/diagnostic/block-bank';
import { chooseBlocks } from './helpers/diagnostic-blocks';

test('all twelve code-block items: every palette choice, navigation, reset, partial resume and private grading', async ({
  page,
}) => {
  if (!process.env.DATABASE_URL?.includes('/skillsetu_audit'))
    throw Error('Disposable fixtures only');
  await page.goto('/diagnostic-v2');
  await page.getByLabel('What should we call you?').fill('Code block fixture QA');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const run = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
  for (const [index, q] of bank.questions.filter((q) => q.codeSlots).entries()) {
    await page.setViewportSize(
      index % 2 ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    await db.diagnosticRun.update({
      where: { id: run.id },
      data: {
        currentQuestionId: q.id,
        currentRationale: 'Disposable code-block UI fixture',
        draft: '{}',
        hintUsed: false,
      },
    });
    await page.reload();
    await page.getByRole('button', { name: 'Resume diagnostic' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(q.title);
    const submit = page.getByRole('button', { name: 'Submit response', exact: true });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Previous blank', exact: true })).toBeDisabled();
    for (const [i, slot] of q.codeSlots!.entries()) {
      await page.getByRole('button', { name: new RegExp('^Blank ' + (i + 1) + ':') }).click();
      const region = page.getByRole('region', {
        name: 'Code blocks for ' + slot.label,
        exact: true,
      });
      for (const choice of slot.choices) {
        await region.getByRole('button', { name: choice.code, exact: true }).click();
        await expect(
          page.getByRole('button', { name: new RegExp('^Blank ' + (i + 1) + ':') }),
        ).toContainText(choice.code);
        await expect(
          region.getByRole('button', { name: choice.code, exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
      }
    }
    await expect(page.getByRole('button', { name: 'Next blank', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Clear blank', exact: true }).click();
    await expect(submit).toBeDisabled();
    const reset = page.getByRole('button', { name: 'Start over', exact: true });
    if (q.codeSlots!.length === 1) {
      await expect(reset).toBeDisabled();
      await chooseBlocks(page, q);
    }
    await reset.click();
    await expect(page.getByRole('status').filter({ hasText: '0 of' })).toBeVisible();
    await page.getByRole('button', { name: 'I’m not sure', exact: true }).click();
    await expect(submit).toBeEnabled();
    await page.getByRole('button', { name: 'I’m not sure', exact: true }).click();
    await expect(submit).toBeDisabled();
    const first = q.codeSlots![0],
      firstChoice = first.choices[0];
    await page
      .getByRole('region', { name: 'Code blocks for ' + first.label, exact: true })
      .getByRole('button', { name: firstChoice.code, exact: true })
      .press('Enter');
    await expect
      .poll(
        async () =>
          (await (await page.request.get('/api/diagnostic-v2')).json()).run.draft.blocks?.[
            first.id
          ],
      )
      .toBe(firstChoice.id);
    await page.reload();
    await page.getByRole('button', { name: 'Resume diagnostic' }).click();
    await expect(page.getByRole('button', { name: /^Blank 1:/ })).toContainText(firstChoice.code);
    await chooseBlocks(page, q);
    if (index % 2) {
      await page.getByRole('button', { name: /^Blank 1:/ }).click();
      const wrong = first.choices.find((c) => c.id !== q.blockKey![first.id])!;
      await page
        .getByRole('region', { name: 'Code blocks for ' + first.label, exact: true })
        .getByRole('button', { name: wrong.code, exact: true })
        .click();
    }
    const publicView = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
    expect(publicView.current).not.toHaveProperty('blockKey');
    expect(publicView.current).not.toHaveProperty('expected');
    expect(publicView.report).toBeNull();
    if (index === 0 || index === 5)
      await page.screenshot({
        path: `test-results/blocks-filled-${index % 2 ? 'mobile' : 'desktop'}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/diagnostic-v2') &&
        r.request().method() === 'POST' &&
        r.request().postDataJSON()?.action === 'answer',
    );
    await submit.click();
    const next = (await (await response).json()).run;
    await expect(
      page.getByRole('heading', { name: next.current.title, exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-outcome="saved"]')).toHaveCount(0);
    await expect(page.getByText('That matches this task.', { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-mood="matched"]')).toHaveCount(0);
    const saved = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
    expect(saved.lastFeedback).not.toHaveProperty('correct');
    expect(saved.report).toBeNull();
    expect(saved.rationale).not.toMatch(
      /suspected gap|deeper understanding|after difficulty|Requested difficulty/,
    );
    const privateResponse = await db.diagnosticResponse.findFirstOrThrow({
      where: { runId: run.id, questionId: q.id },
    });
    expect(privateResponse.correct).toBe(index % 2 === 0);
    await page.screenshot({
      path: `test-results/blocks-neutral-save-${index}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('new form from a saved attempt preserves old draft and ownership', async ({ page }) => {
  await page.goto('/diagnostic-v2');
  await page.getByLabel('What should we call you?').fill('Preserved block attempt');
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const old = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
  const slot = old.current.codeSlots[0];
  await page
    .getByRole('region', { name: 'Code blocks for ' + slot.label, exact: true })
    .getByRole('button')
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get('/api/diagnostic-v2')).json()).run.draft.blocks?.[slot.id],
    )
    .toBe(slot.choices[0].id);
  await page.reload();
  await page
    .getByRole('button', { name: 'Start a new diagnostic (keep this attempt)', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
  const fresh = (await (await page.request.get('/api/diagnostic-v2')).json()).run;
  expect(fresh.id).not.toBe(old.id);
  expect(fresh.answered).toBe(0);
  expect(fresh.bankId).toBe(bank.id);
  await page.goto('/diagnostic-v2?run=' + old.id);
  await page.getByRole('button', { name: 'Resume diagnostic' }).click();
  await expect(page.getByRole('button', { name: /^Blank 1:/ })).toContainText(slot.choices[0].code);
});
