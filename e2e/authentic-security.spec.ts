import { expect, test } from '@playwright/test';
test('task API rejects oversized, forged, unordered and cross-session payloads without disclosing grading keys', async ({
  page,
}) => {
  await page.request.post('/api/demo', {
    data: { action: 'enter', name: 'Input fixture', roleId: 'python-developer' },
  });
  const { attemptId } = await (
    await page.request.post('/api/demo', {
      data: { action: 'start', kind: 'diagnostic', roleId: 'python-developer' },
    })
  ).json();
  const state = await (await page.request.get('/api/demo')).json();
  const first = state.attempts[0].bank.tasks[0];
  const second = state.attempts[0].bank.tasks[1];
  expect(JSON.stringify(state)).not.toMatch(
    /"correct":\d|"expected":|"rubric":|DATABASE_URL|postgresql:\/\//,
  );
  expect(
    (await page.request.post('/api/demo', { data: { action: 'complete', attemptId } })).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post('/api/demo', {
        data: { action: 'task', attemptId, taskId: second.id, payload: { selected: 0 } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post('/api/demo', {
        data: { action: 'task', attemptId, taskId: first.id, payload: { selected: 0, score: 1 } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post('/api/demo', {
        data: { action: 'task', attemptId, taskId: first.id, payload: { text: 'x'.repeat(20000) } },
      })
    ).status(),
  ).toBe(413);
  await page.request.post('/api/demo', { data: { action: 'new-session' } });
  await page.request.post('/api/demo', {
    data: { action: 'enter', name: 'Other fixture', roleId: 'python-developer' },
  });
  expect(
    (
      await page.request.post('/api/demo', {
        data: { action: 'task', attemptId, taskId: first.id, payload: { selected: 0 } },
      })
    ).status(),
  ).toBe(404);
});
