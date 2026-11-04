import { expect, test } from '@playwright/test';
import { pythonBanks } from '../src/lib/authentic/python-banks';
import { solution } from '../tests/authentic-fixtures';
// Shared execution helper without importing another test definition.
import { execute } from './helpers/python-execute';
test('every coding contract in all five published banks executes against its actual cases', async ({
  page,
}) => {
  test.setTimeout(600000);
  await page.goto('/');
  let count = 0;
  for (const bank of pythonBanks)
    for (const task of bank.tasks.filter((t) => t.cases)) {
      const result = await execute(
        page,
        solution(task),
        task.cases!.map((c) => c.args),
      );
      expect(result.error, `${bank.id}: ${task.id}`).toBeUndefined();
      expect(result.outputs, task.id).toEqual(task.cases!.map((c) => c.expected));
      count++;
    }
  expect(count).toBe(130);
});
