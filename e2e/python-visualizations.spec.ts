import { expect, test } from '@playwright/test';
import { pythonTraces } from '../src/lib/learning-studio/trace-content';
import { batchLesson } from '../src/lib/learning-studio/content';
import { execute } from './helpers/python-execute';

for (const width of [1440, 390, 320]) {
  test(`four reusable traces predict, reveal, review and reset at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const messages: unknown[] = [];
    page.on('response', async (response) => {
      if (
        response.url().endsWith('/api/diagnostic-v2/learning') &&
        response.request().method() === 'POST'
      ) {
        const action = response.request().postDataJSON()?.action;
        if (action?.startsWith('trace-') && response.ok()) messages.push(await response.json());
      }
    });
    await page.goto('/diagnostic-v2/learn/visualizations');
    const firstOrigin = new URL(page.url()).origin;
    expect(
      (
        await page.request.post('/api/diagnostic-v2/learning', {
          headers: { Origin: firstOrigin },
          data: { action: 'trace-open', traceId: pythonTraces[0].id },
        })
      ).status(),
    ).toBe(401);
    await page.getByLabel('Your visualization practice name').fill(`Visual synthetic ${width}`);
    await page.getByRole('button', { name: 'Open visualization studio', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Follow a rebinding workspace' })).toBeVisible();
    const origin = new URL(page.url()).origin;
    const post = (data: unknown) =>
      page.request.post('/api/diagnostic-v2/learning', { headers: { Origin: origin }, data });
    const invalid = await post({
      action: 'trace-next',
      traceId: pythonTraces[0].id,
      version: pythonTraces[0].version,
      index: 1,
    });
    expect(invalid.status()).toBe(422);
    expect(
      (
        await post({
          action: 'trace-open',
          traceId: pythonTraces[0].id,
          code: 'arbitrary text is not an executable API contract',
        })
      ).status(),
    ).toBe(422);
    expect(
      (
        await page.request.post('/api/diagnostic-v2/learning', {
          headers: { Origin: 'https://foreign.invalid' },
          data: { action: 'trace-open', traceId: pythonTraces[0].id },
        })
      ).status(),
    ).toBe(403);

    expect(
      (
        await post({
          action: 'trace-next',
          traceId: pythonTraces[0].id,
          version: pythonTraces[0].version,
          index: -1,
          selected: 0,
        })
      ).status(),
    ).toBe(422);
    expect((await post({ action: 'trace-open', traceId: '__proto__' })).status()).toBe(404);
    for (const model of pythonTraces) {
      await page.getByLabel('Choose a visualization').selectOption(model.id);
      const workspace = page.getByRole('region', { name: `${model.title} workspace` });
      await expect(workspace).toBeVisible();
      const previous = workspace.getByRole('button', {
        name: 'Previous execution step',
        exact: true,
      });
      const next = workspace.getByRole('button', { name: 'Next execution step', exact: true });
      await expect(previous).toBeDisabled();
      let firstPrediction = true;
      for (let index = 1; index < model.frames.length; index++) {
        const prediction = model.frames[index].prediction;
        if (prediction) {
          await expect(next).toBeDisabled();
          // A wrong prediction reveals teaching feedback rather than blocking learning.
          const selected = firstPrediction
            ? (prediction.correct + 1) % prediction.options.length
            : prediction.correct;
          firstPrediction = false;
          await workspace.getByRole('radio').first().focus();
          await page.keyboard.press('ArrowRight');
          await expect(workspace.getByRole('radio').nth(1)).toBeChecked();
          await workspace.getByRole('radio').nth(selected).check();
          const choiceColors = await workspace
            .locator('fieldset label')
            .evaluateAll((labels) =>
              labels.map((label) => ({
                selected: label.querySelector('input')!.checked,
                background: getComputedStyle(label).backgroundColor,
              })),
            );
          expect(choiceColors.filter((choice) => choice.selected)).toHaveLength(1);
          expect(choiceColors.find((choice) => choice.selected)!.background).not.toBe(
            choiceColors.find((choice) => !choice.selected)!.background,
          );
        }
        await next.focus();
        await page.keyboard.press('Enter');
        await expect(
          workspace.getByText(`Step ${index} / ${model.frames.length - 1}`, { exact: true }),
        ).toBeVisible();
        await expect(workspace.locator('li[aria-current="step"]')).toContainText(
          model.code[model.frames[index].line - 1].trim(),
        );
        for (const variable of model.frames[index].variables) {
          const row = workspace
            .getByRole('region', { name: 'Visible variable state' })
            .locator('dl > div')
            .filter({
              has: page.locator('dt code', { hasText: new RegExp(`^${variable.name}$`) }),
            });
          await expect(row.locator('dd')).toHaveText(variable.value);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (index === 3)
          await workspace.screenshot({
            path: `test-results/trace-${model.kind}-predict-${width}.png`,
            animations: 'disabled',
          });
        if (index === 2) {
          await previous.click();
          await expect(
            workspace.getByText(`Step 1 / ${model.frames.length - 1}`, { exact: true }),
          ).toBeVisible();
          await next.click(); // Cached review does not require another prediction.
          await expect(
            workspace.getByText(`Step 2 / ${model.frames.length - 1}`, { exact: true }),
          ).toBeVisible();
        }
      }
      await expect(next).toBeDisabled();
      await expect(workspace.getByLabel('Printed output', { exact: true })).toHaveText(
        model.frames.at(-1)!.output.join('\n'),
      );
      const animations = await workspace.evaluate((root) =>
        [...root.querySelectorAll('*')].flatMap((element) => [
          getComputedStyle(element).animationName,
          getComputedStyle(element).transitionDuration,
        ]),
      );
      expect(
        animations.every(
          (value) =>
            value === 'none' ||
            value.split(',').every((duration) => Number.parseFloat(duration) === 0),
        ),
      ).toBe(true);
      await workspace.screenshot({
        path: `test-results/trace-${model.kind}-${width}.png`,
        animations: 'disabled',
      });
      await workspace.getByRole('button', { name: 'Reset and replay', exact: true }).click();
      await expect(
        workspace.getByText(`Step 0 / ${model.frames.length - 1}`, { exact: true }),
      ).toBeVisible();
      await expect(workspace.getByText('No names bound yet.', { exact: true })).toBeVisible();
      await expect(workspace.locator('li[aria-current="step"]')).toHaveCount(0);
      if (model.frames[1].prediction) await expect(next).toBeDisabled();
    }
    expect(messages.length).toBeGreaterThan(25);
    for (const message of messages)
      expect(JSON.stringify((message as { trace: unknown }).trace)).not.toMatch(
        /"(correct|prediction|frames|key|expected)":/,
      );
    expect(errors).toEqual([]);
  });
}

test('reset cancels an in-flight reveal; network failure preserves the prediction and can retry', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2/learn/visualizations');
  await page.getByLabel('Your visualization practice name').fill('Reset synthetic');
  await page.getByRole('button', { name: 'Open visualization studio', exact: true }).click();
  const workspace = page.getByRole('region', { name: 'Follow a rebinding workspace' });
  await workspace.getByRole('radio').first().check();
  const next = workspace.getByRole('button', { name: 'Next execution step', exact: true });
  await page.route('**/api/diagnostic-v2/learning', (route) =>
    route.request().postDataJSON()?.action === 'trace-next' ? route.abort() : route.continue(),
  );
  await next.click();
  await expect(workspace.getByRole('alert')).toBeVisible();
  await expect(workspace.getByRole('radio').first()).toBeChecked();
  await expect(workspace.getByText('Step 0 / 4', { exact: true })).toBeVisible();
  await page.unroute('**/api/diagnostic-v2/learning');
  const held: import('@playwright/test').Route[] = [];
  await page.route('**/api/diagnostic-v2/learning', async (route) => {
    if (route.request().postDataJSON()?.action === 'trace-next') held.push(route);
    else await route.continue();
  });
  await next.click();
  await expect.poll(() => held.length).toBe(1);
  await workspace.getByRole('button', { name: 'Reset trace', exact: true }).click();
  await expect(workspace.getByRole('radio').first()).not.toBeChecked();
  await held[0].continue().catch(() => {});
  await page.unroute('**/api/diagnostic-v2/learning');
  await expect(workspace.getByText('Step 0 / 4', { exact: true })).toBeVisible();
  await workspace.getByRole('radio').first().check();
  await next.click();
  await expect(workspace.getByText('Step 1 / 4', { exact: true })).toBeVisible();
});

test('authored model final values agree with real Python only in the existing opaque sandbox', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2/learn/visualizations');
  const returns = [
    'return [saved, score]',
    'return [alias, queue]',
    'return [total]',
    'return [result]',
  ];
  const expected = [
    [8, 13],
    [
      [2, 7],
      [2, 7, 9],
    ],
    [6],
    [6],
  ];
  for (let index = 0; index < pythonTraces.length; index++) {
    const lines = [...pythonTraces[index].code];
    lines[lines.length - 1] = returns[index];
    const code = 'def solve():\n' + lines.map((line) => '    ' + line).join('\n');
    const result = await execute(page, code, [[]]);
    expect(result.kind).toBe('result');
    expect(result.outputs).toEqual([expected[index]]);
  }
});

test('reviewed execution still times out and cancels when leaving guided practice', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2/learn/studio');
  const origin = new URL(page.url()).origin;
  const post = (data: unknown) =>
    page.request.post('/api/diagnostic-v2/learning', { headers: { Origin: origin }, data });
  await post({ action: 'enter', name: 'Timeout cancellation synthetic' });
  const run = (await (await post({ action: 'start' })).json()).run;
  for (const step of batchLesson.steps.slice(0, -1)) {
    await post({ action: 'visit', runId: run.id, stepId: step.id, requestId: crypto.randomUUID() });
    await post({
      action: 'submit',
      runId: run.id,
      stepId: step.id,
      requestId: crypto.randomUUID(),
      answer: step.key,
    });
  }
  await post({
    action: 'visit',
    runId: run.id,
    stepId: 'batch-execute',
    requestId: crypto.randomUUID(),
  });
  await page.reload();
  await page
    .getByLabel('Python code', { exact: true })
    .fill('def positive_total(values):\n    while True:\n        pass');
  await page.getByRole('button', { name: 'Run Python', exact: true }).click();
  await expect(page.getByText(/Execution timed out after 5 seconds/)).toBeVisible({
    timeout: 65000,
  });
  await expect(page.locator('iframe[title="Isolated Python execution"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run Python', exact: true }).click();
  await expect(page.locator('iframe[title="Isolated Python execution"]')).toHaveCount(1);
  await page.getByRole('link', { name: 'Explore the Python visualization studio' }).click();
  await expect(page.getByRole('heading', { name: 'Make the invisible visible.' })).toBeVisible();
  await expect(page.locator('iframe[title="Isolated Python execution"]')).toHaveCount(0);
});
