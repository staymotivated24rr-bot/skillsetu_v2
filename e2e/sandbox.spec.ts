import { expect, test } from '@playwright/test';
import { execute } from './helpers/python-execute';
test('isolated browser Python executes, times out, recovers and cannot read server environment/files or network', async ({
  page,
}) => {
  await page.goto('/');
  const good = await execute(page, 'def solve(value):\n    return value * 2', [[3], [0]]);
  expect(good.error).toBeUndefined();
  expect(good.kind).toBe('result');
  expect(good.outputs).toEqual([6, 0]);
  const loop = await execute(page, 'def solve(value):\n    while True:\n        pass', [[1]]);
  expect(loop.kind).toBe('timeout');
  const again = await execute(page, 'def solve(value):\n    return value + 1', [[1]]);
  expect(again.outputs).toEqual([2]);
  for (const code of [
    'import os\ndef solve():\n    return os.environ.get("DATABASE_URL")',
    'def solve():\n    return open("/etc/passwd").read()',
    'import js\ndef solve():\n    return js.fetch("/api/demo")',
    'import subprocess\ndef solve():\n    return subprocess.check_output(["env"])',
  ]) {
    const result = await execute(page, code, [[]]);
    expect(
      result.kind === 'error' || JSON.stringify(result.outputs).includes('executionError'),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain('postgresql://');
  }
  const state = await page.request.get('/api/demo');
  expect(await state.json()).toEqual({ session: null });
});
