import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`eight-step studio saves, retries and completes without demo identity transfer at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/diagnostic-v2/learn/studio');
    const origin = new URL(page.url()).origin;
    await page.request.post('/api/demo', {
      headers: { Origin: origin },
      data: { action: 'enter', name: `Unrelated demo ${width}`, roleId: 'python-developer' },
    });
    const demoBefore = await (await page.request.get('/api/demo')).json();
    await page.getByLabel('Your practice name').fill(`Studio learner ${width}`);
    await page.getByRole('button', { name: 'Start demonstration lesson', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'One value at a time', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'One value at a time', exact: true })).toHaveCSS(
      'color',
      'rgb(24, 44, 52)',
    );
    const read = async () =>
      (await (await page.request.get('/api/diagnostic-v2/learning')).json()).run;
    const first = await read();
    expect(first.results).toHaveLength(0);
    const publicData = JSON.stringify(first.lesson);
    for (const key of ['"key":', '"correct":', '"cases":', '"expected":', '"privateTask":'])
      expect(publicData).not.toContain(key);
    await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'I have reviewed the concept' }).check();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('Concept reviewed', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByLabel('Predicted output (integer)').fill('4');
    await expect.poll(async () => (await read()).drafts['batch-predict']?.text).toBe('4');
    await page.reload();
    await expect(page.getByLabel('Predicted output (integer)')).toHaveValue('4');
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('Not correct yet', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Need a hint?', exact: true }).click();
    await expect(
      page.getByText('Write the running total after each of the three values.', { exact: true }),
    ).toBeVisible();
    await page.getByLabel('Predicted output (integer)').fill('5');
    // Commit the retry but lose its transport response. Same request ID must save once.
    let lost = false;
    let finishLoss = () => {};
    const lostTransport = new Promise<void>((resolve) => {
      finishLoss = resolve;
    });
    await page.route('**/api/diagnostic-v2/learning', async (route) => {
      if (
        !lost &&
        route.request().method() === 'POST' &&
        route.request().postDataJSON()?.action === 'submit'
      ) {
        lost = true;
        await route.fetch();
        await route.abort();
        finishLoss();
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Check again', exact: true }).click();
    await lostTransport;
    await expect(page.locator('main [role=alert]')).toBeVisible();
    await page.unroute('**/api/diagnostic-v2/learning');
    await page.getByRole('button', { name: 'Check again', exact: true }).click();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    expect(
      (await read()).results.filter((r: { stepId: string }) => r.stepId === 'batch-predict'),
    ).toHaveLength(2);
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'One value at a time', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByLabel('Predicted output (integer)')).toHaveValue('5');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('radio').nth(1).check();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const numeric = page.getByLabel('Your answer (float, exactly 2 decimal places)');
    await numeric.fill('5');
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.locator('main [role=alert]')).toContainText('exactly 2');
    await expect(numeric).toHaveValue('5');
    expect(
      (await read()).results.filter((r: { stepId: string }) => r.stepId === 'batch-numeric'),
    ).toHaveLength(0);
    await numeric.fill('5.00');
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'value > 0', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `test-results/learning-studio-blocks-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    for (const name of [
      'Move operation 3 up',
      'Move operation 2 up',
      'Move operation 4 up',
      'Move operation 3 up',
      'Move operation 4 up',
    ])
      await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    for (const [label, value] of [
      ['After 0: total', '0'],
      ['After 0: count', '0'],
      ['After 2: total', '2'],
      ['After 2: count', '1'],
      ['After 3: total', '5'],
      ['After 3: count', '2'],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await expect
      .poll(async () => (await read()).drafts['batch-trace']?.state?.['three-total'])
      .toBe('5');
    await page.reload();
    await expect(page.getByLabel('After 3: total', { exact: true })).toHaveValue('5');
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `test-results/learning-studio-trace-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page
      .getByLabel('Python code', { exact: true })
      .fill(
        'def positive_total(values):\n    total = 0\n    for value in values:\n        if value > 0:\n            total += value\n    return total',
      );
    await expect
      .poll(async () => (await read()).drafts['batch-execute']?.execution?.code)
      .toContain('if value > 0');
    await page.reload();
    await expect(page.getByLabel('Python code', { exact: true })).toHaveValue(/if value > 0/);
    await page.getByRole('button', { name: 'Run Python', exact: true }).click();
    await expect(page.getByText('3 / 3 evaluation cases passed', { exact: true })).toBeVisible({
      timeout: 65000,
    });
    await page.getByRole('button', { name: 'Send response', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lesson complete', exact: true })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
    expect((await read()).status).toBe('completed');
    expect(await (await page.request.get('/api/demo')).json()).toEqual(demoBefore);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/learning-studio-complete-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    expect(errors).toEqual([]);
  });
}

test('learning API rejects foreign sessions, forged keys and unsafe transport', async ({
  page,
  browser,
}) => {
  await page.goto('/diagnostic-v2/learn/studio');
  const origin = new URL(page.url()).origin;
  const post = (data: unknown, extra: Record<string, string> = {}) =>
    page.request.post('/api/diagnostic-v2/learning', {
      headers: { Origin: origin, ...extra },
      data,
    });
  expect((await post({ action: 'start' })).status()).toBe(401);
  await post({ action: 'enter', name: 'API synthetic studio' });
  const run = (await (await post({ action: 'start' })).json()).run;
  const other = await browser.newContext({ baseURL: origin });
  await other.request.post('/api/diagnostic-v2/learning', {
    headers: { Origin: origin },
    data: { action: 'enter', name: 'Other studio' },
  });
  expect((await other.request.get(`/api/diagnostic-v2/learning?run=${run.id}`)).status()).toBe(404);
  const action = {
    action: 'submit',
    runId: run.id,
    stepId: 'batch-concept',
    requestId: crypto.randomUUID(),
    answer: { acknowledged: true },
  };
  expect(
    (
      await other.request.post('/api/diagnostic-v2/learning', {
        headers: { Origin: origin },
        data: action,
      })
    ).status(),
  ).toBe(404);
  expect((await post({ ...action, answer: { acknowledged: true, correct: true } })).status()).toBe(
    422,
  );
  expect((await post(action, { Origin: 'https://foreign.invalid' })).status()).toBe(403);
  expect((await post({ ...action, padding: 'x'.repeat(25000) })).status()).toBe(413);
  await other.close();
});
