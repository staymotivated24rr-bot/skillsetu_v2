import { expect, type Page } from '@playwright/test';
import type { Question } from '../../src/lib/diagnostic/types';
export async function chooseBlocks(page: Page, q: Question, correct = true) {
  if (!correct) {
    await page.getByRole('button', { name: 'I’m not sure', exact: true }).click();
    return;
  }
  for (const [i, slot] of q.codeSlots!.entries()) {
    await page.getByRole('button', { name: new RegExp('^Blank ' + (i + 1) + ':') }).click();
    const choice = slot.choices.find((c) => c.id === q.blockKey![slot.id])!;
    await page
      .getByRole('region', { name: 'Code blocks for ' + slot.label, exact: true })
      .getByRole('button', { name: choice.code, exact: true })
      .click();
  }
  await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeEnabled();
}
