import { expect, test } from '@playwright/test';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import type { RunView } from '../src/lib/diagnostic/types';
for (const width of [1440, 390, 320]) {
  test(`learning recommendation snapshots, hints, ownership and navigation at ${width}px`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/diagnostic-v2');
    const origin = new URL(page.url()).origin;
    const post = (data: unknown) =>
      page.request.post('/api/diagnostic-v2/learning', { headers: { Origin: origin }, data });
    expect(
      (await page.request.get('/api/diagnostic-v2/learning?recommendation=foreign')).status(),
    ).toBe(401);
    await post({ action: 'enter', name: `Revision synthetic ${width}` });
    const diagnosticPost = (data: unknown) =>
      page.request.post('/api/diagnostic-v2', { headers: { Origin: origin }, data });
    let diagnostic: RunView = (
      await (await diagnosticPost({ action: 'start', preview: true })).json()
    ).run;
    while (diagnostic.current) {
      const q = bank.questions.find((q) => q.id === diagnostic.current!.id)!;
      diagnostic = (
        await (
          await diagnosticPost({
            action: 'answer',
            runId: diagnostic.id,
            questionId: q.id,
            answer: q.options ? { selected: q.correct } : { text: q.expected![0] },
          })
        ).json()
      ).run;
    }
    const original = await (
      await page.request.get(`/api/diagnostic-v2?run=${diagnostic.id}`)
    ).json();
    await page.goto(`/diagnostic-v2?run=${diagnostic.id}`);
    const panel = page.getByRole('region', { name: 'Adaptive learning and revision' });
    await expect(panel.getByText('Advanced challenge', { exact: true })).toBeVisible();
    await expect(
      panel.getByRole('link', { name: 'Start transfer challenge', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/correction-report-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await panel.getByRole('button', { name: 'Save learning recommendation' }).click();
    await panel.getByText('Save or revisit this guidance', { exact: true }).click();
    const bookmark = panel.getByRole('link', { name: 'Bookmark this learning decision' });
    await expect(bookmark).toBeVisible();
    const archived = await bookmark.getAttribute('href');
    const firstDecision = await (
      await page.request.get(`/api/diagnostic-v2/learning?recommendation=${diagnostic.id}`)
    ).json();
    expect(JSON.stringify(firstDecision)).not.toMatch(
      /"(key|expected|payload|bankSnapshot|contentSnapshot|tokenHash)":/,
    );
    expect(
      (
        await post({
          action: 'learning-select',
          sourceRunId: diagnostic.id,
          suggestedDifficulty: 3,
        })
      ).status(),
    ).toBe(422);
    const run = (
      await (await post({ action: 'start', lessonId: 'python-variables-references' })).json()
    ).run;
    for (let count = 0; count < 3; count++)
      await post({
        action: 'hint',
        runId: run.id,
        stepId: 'vr-names',
        requestId: crypto.randomUUID(),
      });
    await post({
      action: 'submit',
      runId: run.id,
      stepId: 'vr-names',
      requestId: crypto.randomUUID(),
      answer: { acknowledged: true },
    });
    await post({
      action: 'visit',
      runId: run.id,
      stepId: 'vr-rebind',
      requestId: crypto.randomUUID(),
    });
    await post({
      action: 'submit',
      runId: run.id,
      stepId: 'vr-rebind',
      requestId: crypto.randomUUID(),
      answer: { text: '12' },
    });
    await panel.getByRole('button', { name: 'Refresh from saved practice' }).click();
    await expect(panel.getByRole('region', { name: 'Continue learning' })).toContainText(
      '2/12 steps completed',
    );
    await expect(panel.getByText('Advanced challenge', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Save learning recommendation' }).click();
    const next = await (
      await page.request.get(`/api/diagnostic-v2/learning?recommendation=${diagnostic.id}`)
    ).json();
    expect(next.decisionId).not.toBe(firstDecision.decisionId);
    expect(next.recommendation.practice.hintUses).toBe(0);
    expect(next.recommendation.category).toBe('advanced');
    expect(next.recommendation.continueLearning[0].completed).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await panel.screenshot({
      path: `test-results/learning-revision-${width}.png`,
      animations: 'disabled',
    });
    await page.goto(archived!);
    const savedPanel = page.getByRole('region', { name: 'Adaptive learning and revision' });
    await expect(savedPanel).toContainText('Practice mastery: not-started');
    await page.reload();
    await expect(savedPanel).toContainText('Practice mastery: not-started');
    const other = await browser.newContext({ baseURL: origin });
    await other.request.post('/api/diagnostic-v2/learning', {
      headers: { Origin: origin },
      data: { action: 'enter', name: `Revision synthetic ${width}` },
    });
    expect(
      (
        await other.request.get(
          `/api/diagnostic-v2/learning?recommendation=${diagnostic.id}&decision=${firstDecision.decisionId}`,
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await other.request.post('/api/diagnostic-v2/learning', {
          headers: { Origin: origin },
          data: { action: 'learning-select', sourceRunId: diagnostic.id },
        })
      ).status(),
    ).toBe(404);
    await other.close();
    await page.getByRole('link', { name: 'Return to your original diagnostic report' }).click();
    expect(
      await (await page.request.get(`/api/diagnostic-v2?run=${diagnostic.id}`)).json(),
    ).toEqual(original);
    expect(errors).toEqual([]);
  });
}
