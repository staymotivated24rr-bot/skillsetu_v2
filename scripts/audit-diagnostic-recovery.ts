import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { db } from '../src/lib/db';
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (url.hostname !== '127.0.0.1' || url.port !== '15432' || url.pathname !== '/skillsetu_audit')
    throw Error('Local audit database required');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const base = 'http://127.0.0.1:3002';
  const events: Record<string, unknown>[] = [];
  const state = async () =>
    (await (await page.request.get(base + '/api/diagnostic-v2')).json()).run;
  try {
    await page.goto(base + '/diagnostic-v2');
    const start = page.getByRole('button', { name: 'Explore my Python skills' });
    await expect(start).toBeDisabled();
    await page.getByLabel('What should we call you?').fill('   ');
    await expect(start).toBeDisabled();
    await page.getByLabel('What should we call you?').fill('A'.repeat(41));
    expect((await page.getByLabel('What should we call you?').inputValue()).length).toBe(40);
    events.push({
      action: 'nickname blank/whitespace guard and 40-character limit',
      result: 'pass',
    });
    await page.getByLabel('What should we call you?').fill('Supplemental recovery audit');
    await start.click();
    await expect(page.getByRole('button', { name: 'Submit response', exact: true })).toBeVisible();
    const run = await state();
    if (!(await db.diagnosticRun.findUnique({ where: { id: run.id } })))
      throw Error('Database mismatch');
    await page.getByLabel('Your answer', { exact: true }).fill('unsure');
    await expect.poll(async () => (await state()).draft).toEqual({ text: 'unsure' });
    await context.route('**/api/diagnostic-v2', (route) =>
      route.request().postDataJSON()?.action === 'answer'
        ? route.abort('failed')
        : route.continue(),
    );
    await page.getByRole('button', { name: 'Submit response', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await page.screenshot({
      path: 'docs/diagnostic-v2/interaction-audit/screenshots/network-error.png',
      fullPage: true,
    });
    events.push({
      action: 'interrupted save displays application error and preserves zero response count',
      result: 'pass',
    });
    expect((await state()).answered).toBe(0);
    await page.getByRole('button', { name: 'Reconnect & resume' }).click();
    await page.getByRole('button', { name: 'Resume diagnostic' }).click();
    await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('unsure');
    events.push({ action: 'Reconnect & resume restores draft', result: 'pass' });
    await context.unroute('**/api/diagnostic-v2');
    await page.getByRole('button', { name: 'Submit response', exact: true }).dblclick();
    await expect(page.getByText('Response saved', { exact: true })).toBeVisible();
    expect((await state()).answered).toBe(1);
    events.push({ action: 'rapid UI double click persists exactly one response', result: 'pass' });
    await page.getByRole('button', { name: 'Continue discovery' }).click();
    const next = await state();
    if (next.current.options) await page.getByRole('radio').first().check();
    else if (!next.current.steps)
      await page.getByLabel('Your answer', { exact: true }).fill('unsure');
    await context.route('**/api/diagnostic-v2', (route) =>
      route.request().postDataJSON()?.action === 'answer'
        ? route.abort('failed')
        : route.continue(),
    );
    await page.getByRole('button', { name: 'Submit response', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Start a new browser session' }).click();
    await expect(page.getByLabel('What should we call you?')).toBeVisible();
    const preserved = await db.diagnosticRun.findUnique({
      where: { id: run.id },
      include: { responses: true },
    });
    expect(preserved?.responses).toHaveLength(1);
    events.push({
      action: 'Start a new browser session clears session cookie and preserves prior run/response',
      result: 'pass',
    });
    writeFileSync(
      'docs/diagnostic-v2/interaction-audit/RECOVERY_RERUN.json',
      JSON.stringify(
        {
          result: 'pass',
          events,
          reason:
            'Original broad alert locator also matched the Next.js route announcer; recovery checks rerun with main-scoped application alert',
          applicationCodeChanged: false,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ result: 'pass', events }));
  } finally {
    await context.close();
    await browser.close();
    await db.$disconnect();
  }
}
void main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exitCode = 1;
});
