import { expect, test } from '@playwright/test';
import { blockDiagnostic as bank } from '../src/lib/diagnostic/block-bank';
import { variablesLesson } from '../src/lib/learning-studio/variables-lesson';
import type { RunView } from '../src/lib/diagnostic/types';

for (const width of [1440, 390, 320]) {
  test(`report pathway launches, resumes and reviews owned practice at ${width}px`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/diagnostic-v2?preview=legacy');
    const origin = new URL(page.url()).origin;
    const post = (url: string, data: unknown) =>
      page.request.post(url, { headers: { Origin: origin }, data });
    await post('/api/demo', {
      action: 'enter',
      name: 'Identical synthetic name',
      roleId: 'java-developer',
    });
    const demoBefore = await (await page.request.get('/api/demo')).json();
    expect((await page.request.get('/api/diagnostic-v2/learning?source=foreign')).status()).toBe(
      401,
    );
    await post('/api/diagnostic-v2', { action: 'enter', name: 'Identical synthetic name' });
    let run: RunView = (
      await (await post('/api/diagnostic-v2', { action: 'start', preview: false })).json()
    ).run;
    while (run.current) {
      const q = bank.questions.find((q) => q.id === run.current!.id)!;
      const answer = q.codeSlots
        ? { blocks: q.blockKey }
        : q.options
          ? { selected: q.correct }
          : q.steps
            ? { order: q.order }
            : { text: q.expected![0] };
      const response = await post('/api/diagnostic-v2', {
        action: 'answer',
        runId: run.id,
        questionId: q.id,
        answer,
      });
      expect(response.ok()).toBe(true);
      run = (await response.json()).run;
    }
    const reportBefore = await (await page.request.get(`/api/diagnostic-v2?run=${run.id}`)).json();
    const bookmark = `/diagnostic-v2?run=${run.id}&preview=legacy`;
    await page.goto(bookmark);
    const pathway = page.getByRole('region', { name: 'Your personalized learning pathway' });
    await expect(pathway.locator('a[href*="/learn/variables"]')).toBeVisible();
    await expect(pathway).toContainText('Optional concept enrichment');
    const pathwayData = await (
      await page.request.get(`/api/diagnostic-v2/learning?source=${run.id}`)
    ).json();
    expect(pathwayData.pathway.saved).toBe(false);
    expect(JSON.stringify(pathwayData)).not.toMatch(
      /"(key|expected|bankSnapshot|contentSnapshot|tokenHash)":/,
    );
    const other = await browser.newContext({ baseURL: origin });
    await other.request.post('/api/diagnostic-v2', {
      headers: { Origin: origin },
      data: { action: 'enter', name: 'Identical synthetic name' },
    });
    expect((await other.request.get(`/api/diagnostic-v2/learning?source=${run.id}`)).status()).toBe(
      404,
    );
    expect(
      (
        await other.request.post('/api/diagnostic-v2/learning', {
          headers: { Origin: origin },
          data: {
            action: 'start',
            lessonId: variablesLesson.id,
            sourceRunId: run.id,
            competencyId: 'collections',
          },
        })
      ).status(),
    ).toBe(404);
    await pathway.locator('a[href*="/learn/variables"]').click();
    await expect(
      page.getByRole('heading', { name: 'A name is a label, not a box', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Your practice name')).toHaveCount(0);
    const read = async () =>
      (
        await (
          await page.request.get('/api/diagnostic-v2/learning?lesson=python-variables-references')
        ).json()
      ).run;
    const learningId = (await read()).id;
    expect(
      (await other.request.get(`/api/diagnostic-v2/learning?run=${learningId}`)).status(),
    ).toBe(404);
    expect(
      (
        await other.request.post('/api/diagnostic-v2/learning', {
          headers: { Origin: origin },
          data: {
            action: 'submit',
            runId: learningId,
            stepId: 'vr-names',
            requestId: crypto.randomUUID(),
            answer: { acknowledged: true },
          },
        })
      ).status(),
    ).toBe(404);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByLabel('Predicted output (integer)').fill('12');
    await expect.poll(async () => (await read()).drafts['vr-rebind']?.text).toBe('12');
    await page.reload();
    await expect(page.getByLabel('Predicted output (integer)')).toHaveValue('12');
    await page.getByRole('link', { name: 'Return to your source diagnostic report' }).click();
    await expect(pathway.locator('a[href*="/learn/variables"]')).toBeVisible();
    await expect(pathway).toContainText('1/12 steps');
    const contrasts = await pathway.evaluate((root) => {
      const rgb = (value: string) =>
        value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const luminance = (values: number[]) =>
        values
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      return [...root.querySelectorAll('h2,h3,h4,p,a,summary,strong')].map((element) => {
        let background: Element | null = element;
        while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)')
          background = background.parentElement;
        const foreground = luminance(rgb(getComputedStyle(element).color));
        const behind = luminance(rgb(getComputedStyle(background!).backgroundColor));
        return {
          text: element.textContent?.slice(0, 60),
          ratio: (Math.max(foreground, behind) + 0.05) / (Math.min(foreground, behind) + 0.05),
        };
      });
    });
    for (const contrast of contrasts)
      expect(contrast.ratio, contrast.text).toBeGreaterThanOrEqual(4.5);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/pathway-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await pathway.locator('a[href*="/learn/variables"]').click();
    await expect(page.getByLabel('Predicted output (integer)')).toHaveValue('12');
    expect((await read()).id).toBe(learningId);
    for (const step of variablesLesson.steps.slice(1)) {
      if (step.id !== 'vr-rebind')
        expect(
          (
            await post('/api/diagnostic-v2/learning', {
              action: 'visit',
              runId: learningId,
              stepId: step.id,
              requestId: crypto.randomUUID(),
            })
          ).ok(),
        ).toBe(true);
      expect(
        (
          await post('/api/diagnostic-v2/learning', {
            action: 'submit',
            runId: learningId,
            stepId: step.id,
            requestId: crypto.randomUUID(),
            answer: step.key,
          })
        ).ok(),
      ).toBe(true);
    }
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lesson complete', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Return to your source diagnostic report' }).click();
    await expect(pathway.locator('a[href*="/learn/variables"]')).toBeVisible();
    expect(await (await page.request.get(`/api/diagnostic-v2?run=${run.id}`)).json()).toEqual(
      reportBefore,
    );
    expect(await (await page.request.get('/api/demo')).json()).toEqual(demoBefore);
    await pathway.locator('a[href*="/learn/variables"]').click();
    await expect(page.getByRole('region', { name: 'Learning review' })).toBeVisible();
    await page.goto(bookmark);
    await page.getByText('All report learning links', { exact: true }).click();
    const oldPractice = page.getByRole('link', { name: 'Explore the SkillSetu module' }).first();
    await page.locator('summary').filter({ hasText: 'Evidence and next steps' }).first().click();
    await oldPractice.click();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page).toHaveURL(/\/diagnostic-v2\/learn/);
    expect(errors).toEqual([]);
    await other.close();
  });
}
