import { expect, test } from '@playwright/test';
import {
  loopsLesson,
  divisionLesson,
  transferLesson,
} from '../src/lib/learning-studio/correction-lessons';
import { lessonForOrdinal } from '../src/lib/learning-studio/catalog';
import { execute } from './helpers/python-execute';
for (const width of [1440, 390, 320])
  test(`focused lesson interactions, blanks, validation and resume at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const lesson of [loopsLesson, divisionLesson, transferLesson]) {
      await page.goto(`/diagnostic-v2/learn/lesson?lesson=${lesson.id}`);
      await expect(
        page.getByRole('button', { name: 'Begin the lesson', exact: true }),
      ).toBeVisible();
      if (await page.getByLabel('Your practice name').count())
        await page.getByLabel('Your practice name').fill(`Correction synthetic ${width}`);
      await page.getByRole('button', { name: 'Begin the lesson', exact: true }).click();
      const read = async () =>
        (await (await page.request.get(`/api/diagnostic-v2/learning?lesson=${lesson.id}`)).json())
          .run;
      await expect(
        page.getByRole('heading', { name: lesson.steps[0].title, exact: true }),
      ).toBeVisible();
      expect(
        (await read()).lesson.steps
          .slice(1)
          .every((s: { locked?: boolean; code?: string }) => s.locked && !s.code),
      ).toBe(true);
      for (const [index, step] of lesson.steps.entries()) {
        await expect(page.getByRole('heading', { name: step.title, exact: true })).toBeVisible();
        const check = page.getByRole('button', { name: /^Check (answer|again)$/ });
        if (step.kind === 'explanation') {
          if (step.referenceFrames) {
            await page.getByRole('button', { name: 'Next statement', exact: true }).focus();
            await page.keyboard.press('Enter');
            await expect.poll(async () => (await read()).drafts[step.id]?.frame).toBe(1);
            await page.reload();
            expect((await read()).currentStepId).toBe(step.id);
            await expect(
              page.getByRole('button', { name: 'Previous statement', exact: true }),
            ).toBeEnabled();
            await page.screenshot({
              path: `test-results/correction-${lesson.id}-visual-${width}.png`,
              fullPage: true,
              animations: 'disabled',
            });
          }
          await page.getByRole('checkbox').check();
        } else if (step.kind === 'blocks') {
          for (const [slotIndex, slot] of step.slots!.entries()) {
            await page
              .getByRole('button', { name: new RegExp(`^Blank ${slotIndex + 1}:`) })
              .click();
            const choice = slot.choices.find((c) => c.id === step.key!.blocks![slot.id])!;
            await page
              .getByRole('region', { name: `Code blocks for ${slot.label}` })
              .getByRole('button', { name: choice.code, exact: true })
              .click();
          }
          await page.screenshot({
            path: `test-results/correction-${lesson.id}-blocks-${width}.png`,
            fullPage: true,
            animations: 'disabled',
          });
        } else if (step.cells) {
          for (const cell of step.cells)
            await page.getByLabel(cell.label, { exact: true }).fill(step.key!.state![cell.id]);
        } else {
          const input = page.getByRole('textbox').last();
          if (step.id === 'division-float') {
            await input.fill('6');
            await check.click();
            await expect(page.locator('[id="division-float-error"]')).toContainText('exactly 1');
            await expect(input).toHaveValue('6');
            if (width === 320)
              await page.screenshot({
                path: 'test-results/correction-numeric-error-320.png',
                fullPage: true,
                animations: 'disabled',
              });
            expect((await read()).completed).toBe(index);
            await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
          }
          if (step.id === 'loop-predict') {
            await input.fill('8');
            await check.click();
            await expect(page.getByText('Not correct yet', { exact: true })).toBeVisible();
            await page.getByRole('button', { name: 'Need a hint?', exact: true }).click();
          }
          await input.fill(step.key!.text!);
        }
        if (step.id === 'division-verify') {
          const share = page.getByLabel('Exact share (float, one decimal place)', { exact: true });
          await share.fill('7');
          await check.click();
          await expect(page.locator('[id="division-verify-error"]')).toContainText('exactly 1');
          await expect(share).toHaveAttribute('aria-invalid', 'true');
          expect((await read()).completed).toBe(index);
          await share.fill(step.key!.state!.share);
        }
        await check.click();
        if (index < lesson.steps.length - 1)
          await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
        else
          await expect(
            page.getByRole('heading', { name: 'Lesson complete', exact: true }),
          ).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (index === 2) {
          await page.reload();
          await expect(page.getByRole('heading', { name: step.title, exact: true })).toBeVisible();
          expect((await read()).completed).toBe(index + 1);
        }
        if (index < lesson.steps.length - 1)
          await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
      await expect(
        page.getByRole('heading', { name: 'Lesson complete', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Lesson mastery demonstrated', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/correction-${lesson.id}-complete-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      const old = await read();
      await page.getByRole('button', { name: 'New practice run', exact: true }).click();
      await expect.poll(async () => (await read()).ordinal).toBe(old.ordinal + 1);
      expect((await read()).completed).toBe(0);
    }
    expect(errors).toEqual([]);
  });
test('new authored final variants agree with actual browser Python in the existing opaque sandbox', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2/learn/studio');
  for (const lesson of [loopsLesson, divisionLesson, transferLesson])
    for (let ordinal = 1; ordinal <= 3; ordinal++) {
      const final = lessonForOrdinal(lesson, ordinal).steps.find((s) => s.kind === 'mastery')!;
      const lines = final.code!.split('\n');
      const last = lines.pop()!;
      const code =
        'def solve():\n' +
        [...lines, 'return ' + last.slice(6, -1)].map((l) => '    ' + l).join('\n');
      const expected = final.cells!.map((c) => {
        const v = final.key!.state![c.id];
        return v.startsWith('[') ? JSON.parse(v) : Number(v);
      });
      const result = await execute(page, code, [[]]);
      expect(result.kind).toBe('result');
      expect(result.outputs).toEqual([expected]);
    }
});
