import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { starterSource, starterDiagnostic } from '../src/lib/diagnostic/starter-v3/bank';
import { sandboxDocument } from '../src/lib/authentic/sandbox-document';
import { execute } from './helpers/python-execute';

test('verify supplied authored code keys in an opaque-origin Pyodide worker, never Node', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto('/diagnostic-v2');
  // Test-only standard-library additions for trusted authored snippets. Production CSP,
  // network lockdown, learner allowlist and worker timeout remain unchanged.
  const document = sandboxDocument(new URL(page.url()).origin).replace(
    "_allowed = {'json'",
    "_allowed = {'fractions', 'dataclasses', 'heapq', 'unittest', 'pathlib', 'contextlib', 'json'",
  );
  const wrapper = `def solve(batch):
    results = []
    for item in batch:
        lines = []
        def capture(*args, sep=' ', end='\\n', **kwargs):
            lines.append(sep.join(str(arg) for arg in args) + end)
        ns = {'__builtins__': __builtins__, '__name__': 'builtins', 'print': capture}
        error = None
        try:
            exec(item['code'], ns, ns)
        except Exception as exc:
            error = type(exc).__name__
        results.append({'id': item['id'], 'stdout': ''.join(lines).strip(), 'exception': error})
    return results`;
  const authored = starterSource.questions.filter((q) => q.code);
  const results: { id: string; stdout: string; exception: string | null }[] = [];
  for (let i = 0; i < authored.length; i += 24) {
    const result = await execute(
      page,
      wrapper,
      [[authored.slice(i, i + 24).map((q) => ({ id: q.id, code: q.code }))]],
      'solve',
      document,
    );
    expect(result.kind, JSON.stringify(result)).toBe('result');
    results.push(...(result.outputs![0] as typeof results));
  }
  const reviewed = results.map((r) => {
    const q = authored.find((q) => q.id === r.id)!;
    return {
      ...r,
      expected: q.printed_output ?? q.correct_answer,
      pass:
        q.printed_output === null
          ? r.exception === q.correct_answer
          : r.exception === null && r.stdout === q.printed_output,
    };
  });
  mkdirSync('docs/diagnostic-v2/starter-v3', { recursive: true });
  writeFileSync(
    'docs/diagnostic-v2/starter-v3/CODE_KEY_RESULTS.json',
    JSON.stringify(
      {
        runtime:
          'Pinned Pyodide 0.29.3, browser opaque-origin Worker; test-only trusted-module allowlist',
        reviewed,
      },
      null,
      2,
    ),
  );
  expect(reviewed).toHaveLength(306);
  expect(reviewed.filter((r) => !r.pass)).toEqual([]);
});

test('clarified environment and CSV options distinguish empty values, wrong keys and directory matches', async ({
  page,
}) => {
  await page.goto('/diagnostic-v2');
  const document = sandboxDocument(new URL(page.url()).origin).replace(
    "_allowed = {'json'",
    "_allowed = {'os', 'pathlib', 'json'",
  );
  const environment = starterDiagnostic.questions.find((q) => q.id === 'SS-PY-0343')!;
  const csv = starterDiagnostic.questions.find((q) => q.id === 'SS-PY-0344')!;
  const code = `import os
from pathlib import Path
def solve(environment_options, csv_options):
    cases = [{}, {'API_KEY': ''}, {'API_KEY': 'set'}, {'api_key': 'set'}, {'API-KEY': 'set'}]
    environment_matches = []
    for expression in environment_options:
        outputs = []
        for case in cases:
            os.environ = case
            outputs.append(eval(expression, {'os': os}))
        environment_matches.append(outputs == [False, True, True, False, False])
    Path('data').mkdir(exist_ok=True)
    for name in ['data.csv', 'other.csv', 'notes.txt']:
        Path('data', name).write_text('sample', encoding='utf-8')
    Path('data', 'folder.csv').mkdir(exist_ok=True)
    Path('data', 'folder.csv', 'nested.csv').write_text('nested', encoding='utf-8')
    csv_matches = []
    for expression in csv_options:
        paths = list(eval(expression, {'Path': Path}))
        csv_matches.append(sorted(str(p) for p in paths) == ['data/data.csv', 'data/other.csv'])
    return {'environment': environment_matches, 'csv': csv_matches}`;
  const result = await execute(
    page,
    code,
    [[environment.options!, csv.options!]],
    'solve',
    document,
  );
  expect(result.kind, JSON.stringify(result)).toBe('result');
  expect(result.outputs).toEqual([
    { environment: [false, false, false, true], csv: [false, false, true, false] },
  ]);
});
