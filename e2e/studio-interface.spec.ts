import { test, expect } from '@playwright/test';
import { diagnostic } from '../src/lib/simulations';

for (const width of [1440, 390, 320]) {
  test(`Learning Studio spans landing, workspace, assessment, learning, reports and cohorts at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const fit = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    const shot = async (name: string) => {
      await fit();
      if (width !== 320)
        await page.screenshot({
          path: `test-results/studio-${name}-${width}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      if (width === 1440)
        await page.screenshot({
          path: `test-results/studio-${name}-cover.png`,
          fullPage: false,
          animations: 'disabled',
        });
    };
    await page.goto('/');
    await expect(page.locator('.landing-nav .studio-mark')).toHaveCSS(
      'background-color',
      'rgb(197, 239, 117)',
    );
    await expect(page.locator('.hero-copy h1')).toHaveCSS('font-family', /Georgia/);
    await shot('landing');
    await page.getByRole('button', { name: 'Find my skill gaps', exact: true }).click();
    await shot('onboarding');
    await page.getByLabel('What should we call you?').fill(`Studio synthetic QA ${width}`);
    await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `Welcome, Studio synthetic QA ${width}.`, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'New demo session', exact: true })).toBeVisible();
    await shot('workspace');
    await expect(page.locator('.studio-side-companion svg > g')).toHaveCSS(
      'animation-name',
      'none',
    );
    const ids = await page.locator('svg linearGradient').evaluateAll((es) => es.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
    await expect(page.locator('.action-panel')).toHaveCSS('background-color', 'rgb(250, 249, 241)');
    const contrast = await page
      .locator('.action-panel p')
      .first()
      .evaluate((el) => {
        const luminance = (css: string) => {
          const rgb = css
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => v / 255)
            .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const text = luminance(getComputedStyle(el).color),
          background = luminance(getComputedStyle(el.closest('.action-panel')!).backgroundColor);
        return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
      });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await page.getByRole('radio').first().focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio').first()).toBeChecked();
    await shot('assessment');
    const state = await (await page.request.get('/api/demo')).json();
    const attempt = state.attempts.find((a: { status: string }) => a.status === 'in_progress');
    // Own synthetic baseline only; full UI submission/practice paths are covered by journey.spec.ts.
    for (const q of diagnostic.flatMap((s) => s.items)) {
      const response = await page.request.post('/api/demo', {
        data: {
          action: 'answer',
          attemptId: attempt.id,
          questionId: q.id,
          selected: (q.correct + 1) % q.options.length,
        },
      });
      expect(response.ok()).toBe(true);
    }
    expect(
      (
        await page.request.post('/api/demo', {
          data: { action: 'complete', attemptId: attempt.id },
        })
      ).ok(),
    ).toBe(true);
    await page.goto('/#report');
    await page.reload();
    await expect(page.locator('.report-hero')).toBeVisible();
    await expect(page.locator('.report-hero')).toHaveCSS('background-color', 'rgb(250, 249, 241)');
    await shot('report');
    if (width === 1440) {
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('.sidebar')).toBeHidden();
      await page.pdf({
        path: 'test-results/studio-report.pdf',
        format: 'A4',
        printBackground: true,
      });
      await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
    }
    await page.goto('/#learning');
    await expect(page.locator('.learning-banner')).toBeVisible();
    await shot('learning-plan');
    await page
      .locator('.module-card')
      .first()
      .getByRole('button', { name: 'Start learning', exact: true })
      .click();
    await expect(page.locator('.lesson-work')).toHaveCSS('background-color', 'rgb(250, 249, 241)');
    await shot('lesson');
    await page.getByRole('button', { name: 'Structured', exact: true }).click();
    await expect(page.locator('.concept-content')).toBeVisible();
    await shot('structured-lesson');
    await page.goto('/#college');
    await expect(page.getByRole('heading', { name: 'Cohort overview', exact: true })).toBeVisible();
    await expect(page.locator('.results-columns .card .eyebrow').first()).toHaveCSS(
      'color',
      'rgb(40, 103, 123)',
    );
    await shot('cohort');
    if (width !== 1440) {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Close navigation', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Open navigation', exact: true }),
      ).toBeFocused();
      expect(await page.locator('body').evaluate((e) => e.style.overflow)).not.toBe('hidden');
    }
    const final = await (await page.request.get('/api/demo')).json();
    expect(final.attempts[0].score).toBe(0);
    await page.goto('/diagnostic-v2/learn?skill=starter-dsa&subskill=Algorithmic%20complexity');
    await expect(page.locator('.studio-repair')).toHaveCSS(
      'background-color',
      'rgb(250, 249, 241)',
    );
    await page
      .getByRole('textbox')
      .fill('Halve the sorted search range until the target is found or no candidates remain.');
    await page
      .getByRole('button', { name: 'Compare with the worked example', exact: true })
      .click();
    await expect(
      page.getByText('Stage 2 of 3 · practice does not change diagnostic results', { exact: true }),
    ).toBeVisible();
    await shot('guided-repair');
    expect(errors).toEqual([]);
  });
}
