import { createHash } from 'node:crypto';
import { pythonDiagnostic as legacy } from './python-bank';
import type { Bank, Question } from './types';
const specific: Record<string, string> = {
  values: 'Trace zero, missing values and the exclusive stop separately.',
  collections:
    'Distinguish the original container from a new outer copy; check an absent key separately from None.',
  functions: 'Record the returned value and any state retained between calls.',
  errors:
    'Identify the failing operation and the narrow exception scope; follow cleanup separately.',
  validation: 'Check zero, None and bool independently against the input contract.',
  testing:
    'Derive an expected boundary outcome from the contract before inspecting implementation.',
};
const questions: Question[] = legacy.questions.map((q) => {
  const id = 'review2-' + q.id;
  const stepId = (s: string) =>
    'step-' +
    createHash('sha256')
      .update(id + s)
      .digest('hex')
      .slice(0, 12);
  const offset = q.options
    ? parseInt(createHash('sha256').update(id).digest('hex').slice(0, 2), 16) % q.options.length
    : 0;
  return {
    ...q,
    id,
    version: '2.0.0',
    subskill:
      q.competencyId === 'values'
        ? q.id.includes('patch-3') || q.id.includes('decision')
          ? 'truthiness'
          : 'loop boundaries'
        : q.competencyId === 'collections'
          ? q.id.includes('patch-3') || q.id.includes('decision')
            ? 'dictionary access'
            : 'aliasing'
          : q.competencyId === 'functions'
            ? q.id.includes('patch-3')
              ? 'side effects'
              : q.id.includes('trace-1') || q.id.includes('decision')
                ? 'return values'
                : 'default arguments'
            : legacy.competencies.find((c) => c.id === q.competencyId)!.subskills[
                q.difficulty === 3 ? 2 : q.difficulty === 2 ? 1 : 0
              ],
    contract: q.expected ? { kind: 'python-fragment', examples: q.expected } : undefined,
    hint: `${q.title}: ${specific[q.competencyId]} ${q.type === 'ordering' ? 'Establish the defect before choosing a repair.' : 'Write down one concrete case before generalizing.'}`,
    steps: q.steps?.map((s) => ({ ...s, id: stepId(s.id) })),
    order: q.order?.map(stepId),
    options: q.options ? [...q.options.slice(offset), ...q.options.slice(0, offset)] : undefined,
    correct:
      q.correct === undefined
        ? undefined
        : (q.correct - offset + q.options!.length) % q.options!.length,
    difficultyReason:
      q.difficulty === 1
        ? 'Single-state foundation check'
        : q.difficulty === 2
          ? 'Track state and a boundary condition'
          : 'Preserve a caller contract while checking a repair',
    exposureFamily: q.id,
  };
});
const additions: [string, string, string, string, string, string, string][] = [
  [
    'values',
    'loop-boundary',
    'Manipulate the dispatch boundary',
    'Choose the exclusive stop that visits indices 0 through 4 exactly once.',
    'for index in range(___):\n    send(index)',
    '5',
    'The stop is excluded: five rows use indices 0–4.',
  ],
  [
    'values',
    'state-cards',
    'Step through a filtered counter',
    'What is total after processing all three readings?',
    'total = 0\nfor reading in [0, 2, 3]:\n    if reading > 0:\n        total += reading',
    '5',
    'Zero contributes nothing; positive readings contribute 2 and 3.',
  ],
  [
    'collections',
    'error-location',
    'Locate the skipped neighbour',
    'Enter the line number that mutates the list being iterated.',
    '1: for row in rows:\n2:     if not row.valid:\n3:         rows.remove(row)',
    '3',
    'Removing from the iterated list shifts subsequent positions. Build a new collection instead.',
  ],
  [
    'collections',
    'dictionary-default',
    'Preserve an explicit missing value',
    'Predict the value for an explicit None; dict.get defaults only for absent keys.',
    'row = {"note": None}\nprint(row.get("note", ""))',
    'None',
    'A present key whose value is None does not trigger the default.',
  ],
  [
    'functions',
    'state-cards',
    'Track independent calls',
    'Enter the integer printed after the two calls.',
    'def add(x, values=None):\n    if values is None:\n        values = []\n    values.append(x)\n    return len(values)\nadd(4)\nprint(add(9))',
    '1',
    'Each omitted argument allocates a fresh list.',
  ],
  [
    'functions',
    'return-contract',
    'Preserve caller ordering',
    'Enter a non-mutating expression returning items in ascending order.',
    'def ordered(items):\n    return ___',
    'sorted(items)',
    'sorted returns a new list; items.sort() mutates and returns None.',
  ],
  [
    'errors',
    'error-location',
    'Identify a narrow handler',
    'Enter the line number that masks an unrelated programming bug.',
    '1: try:\n2:     count = int(raw)\n3:     persist(count)\n4: except Exception:\n5:     return 0',
    '4',
    'An overbroad handler turns unrelated failures into fabricated success.',
  ],
  [
    'errors',
    'cleanup',
    'Trace failure cleanup',
    'Enter the final integer value of closed.',
    'closed = 0\ntry:\n    int("bad")\nexcept ValueError:\n    pass\nfinally:\n    closed += 1',
    '1',
    'finally runs when the protected block fails too.',
  ],
  [
    'validation',
    'exact-type',
    'Reject boolean quantities',
    'Enter the expression that accepts only the exact int type, excluding bool.',
    'if ___:\n    accept(qty)',
    'type(qty) is int',
    'bool is an int subclass; exact type identity excludes it.',
  ],
  [
    'validation',
    'range-check',
    'Guard a batch limit',
    'Enter a condition using qty that rejects negative quantities.',
    'if ___:\n    raise ValueError("negative")',
    'qty < 0',
    'Zero remains valid; negative quantities violate the contract.',
  ],
  [
    'testing',
    'boundary',
    'Choose an independent empty-case expectation',
    'Enter the integer expected for the sum of an empty batch.',
    'def total(rows):\n    return sum(rows)\nassert total([]) == ___',
    '0',
    'The empty additive total is zero; derive it independently.',
  ],
  [
    'testing',
    'error-location',
    'Locate the circular expectation',
    'Enter the line number that repeats the implementation rather than an independent expected value.',
    '1: actual = total(rows)\n2: expected = total(rows)\n3: assert actual == expected',
    '2',
    'Calling the same implementation twice cannot independently verify its contract.',
  ],
];
for (const [competencyId, subskill, title, prompt, code, expected, explanation] of additions) {
  questions.push({
    id: `review2-${competencyId}-parallel-${subskill}`,
    version: '2.0.0',
    competencyId,
    subskill,
    type: 'completion',
    difficulty: 2,
    title,
    prompt,
    code,
    expected: [expected],
    contract: { kind: 'python-fragment', examples: [expected] },
    hint: `${title}: ${specific[competencyId]} Consider a neighbouring boundary case without running code.`,
    explanation,
    misconception: `possible-${subskill}-contract`,
    seconds: 120,
    context: 'Original SkillSetu service-repair exercise',
    accessibility: { inputLabel: 'Your answer', codeLanguage: 'python' },
    interaction: ['loop-boundary', 'state-cards', 'error-location'].includes(subskill)
      ? (subskill as 'loop-boundary' | 'state-cards' | 'error-location')
      : undefined,
    difficultyReason: 'Applied transfer to a different boundary or failure context',
    exposureFamily: `${competencyId}-${subskill}-parallel`,
  });
}
export const reviewedDiagnostic: Bank = {
  ...legacy,
  id: 'python-adaptive-reviewed-2.0.0',
  version: '2.0.0',
  questions,
};
