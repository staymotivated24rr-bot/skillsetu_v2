import type { Bank, Question, Competency } from './types';
const competencies: Competency[] = [
  {
    id: 'values',
    name: 'Values & control flow',
    prerequisites: [],
    skillIds: ['py-fundamentals'],
    moduleSkillId: 'py-fundamentals',
    subskills: ['truthiness', 'loop boundaries', 'branch tracing'],
  },
  {
    id: 'collections',
    name: 'Collections & mutation',
    prerequisites: ['values'],
    skillIds: ['py-structures'],
    moduleSkillId: 'py-structures',
    subskills: ['aliasing', 'dictionary access', 'safe iteration'],
  },
  {
    id: 'functions',
    name: 'Function contracts',
    prerequisites: ['values'],
    skillIds: ['py-functions'],
    moduleSkillId: 'py-functions',
    subskills: ['return values', 'default arguments', 'side effects'],
  },
  {
    id: 'errors',
    name: 'Failure handling',
    prerequisites: ['functions'],
    skillIds: ['py-exceptions'],
    moduleSkillId: 'py-exceptions',
    subskills: ['specific exceptions', 'cleanup', 'propagation'],
  },
  {
    id: 'validation',
    name: 'Input validation',
    prerequisites: ['collections'],
    skillIds: ['py-validation'],
    moduleSkillId: 'py-validation',
    subskills: ['absence versus zero', 'boolean integers', 'atomic validation'],
  },
  {
    id: 'testing',
    name: 'Testing & verification',
    prerequisites: ['functions', 'errors'],
    skillIds: ['py-testing'],
    moduleSkillId: 'py-testing',
    subskills: ['boundary tests', 'regression cases', 'independent expected results'],
  },
];
// Each row is independently authored. Published ID/version is immutable; fork for edits.
// Six items per competency: two foundation, two applied, two transfer/verification.
type Content = {
  easy: [string, string, string];
  decision: [string, string[], number, string];
  medium: [string, string, string];
  patch: [string, string, string[], string];
  hard: [string, string, string[], string];
  workflow: [string, string[], string];
  misconception: string;
};
const content: Record<string, Content> = {
  values: {
    easy: [
      'Trace a batch counter',
      'total = 0\nfor n in range(3):\n    total += n\nprint(total)',
      '3',
    ],
    decision: [
      'A sensor reading may be 0 or None. Which condition detects only a missing reading?',
      ['reading is None', 'not reading', 'reading == 0'],
      0,
      'Zero is a valid reading. None represents an absent value.',
    ],
    medium: [
      'Trace the dispatch filter. Enter the printed integer.',
      'total = 0\nfor n in [0, 2, -1, 3]:\n    if n <= 0:\n        continue\n    total += n\nprint(total)',
      '5',
    ],
    patch: [
      'Complete the range upper bound so exactly indices 0, 1, 2, 3 are visited. Enter only the missing integer.',
      'for index in range(___):\n    send(index)',
      ['4'],
      'The stop value of range is excluded.',
    ],
    hard: [
      'Complete the guard so a missing reading is rejected while 0 remains valid. Enter only the missing expression using reading.',
      'if ___:\n    raise ValueError("missing")',
      ['reading is None', 'None is reading'],
      'Identity with None separates absence from falsy but valid values.',
    ],
    workflow: [
      'Order a safe repair of a loop that silently skips the last record.',
      [
        'Reproduce the missing final record with a small input',
        'Trace the current range bounds',
        'Change the exclusive stop to include every valid index',
        'Verify empty, one-record and multi-record inputs',
      ],
      'Reproduce and trace before changing the boundary; verify several input sizes.',
    ],
    misconception: 'truthiness-or-exclusive-boundary',
  },
  collections: {
    easy: ['Trace list growth', 'items = [4]\nitems.append(7)\nprint(len(items))', '2'],
    decision: [
      'Need to look up an invoice by its unique ID repeatedly. Which structure directly models this?',
      [
        'A list searched every time',
        'A dictionary keyed by invoice ID',
        'A single comma-separated string',
      ],
      1,
      'A dictionary explicitly maps stable IDs to their invoices.',
    ],
    medium: [
      'A caller keeps a reference to a queue. What integer is printed?',
      'queue = [1, 2]\nbackup = queue\nbackup.append(3)\nprint(len(queue))',
      '3',
    ],
    patch: [
      'Complete the shallow copy before appending. Enter only the missing method name.',
      'original = [1, 2]\nbackup = original.___()\nbackup.append(3)',
      ['copy'],
      'list.copy produces a new outer list; nested objects would still be shared.',
    ],
    hard: [
      'Read an optional note with a default empty string. Enter the complete expression using row and single or double quotes.',
      '# row is a dictionary\nnote = ___',
      ["row.get('note', '')", 'row.get("note", "")', "row.get('note','')", 'row.get("note","")'],
      'dict.get supplies the default only for an absent key; it does not replace an explicit None.',
    ],
    workflow: [
      'Order a repair for removing invalid rows without skipping neighbours.',
      [
        'Reproduce with two adjacent invalid rows',
        'Identify mutation of the list being iterated',
        'Build a new list of valid rows',
        'Check adjacent invalid rows, all invalid rows and unchanged input',
      ],
      'Changing a collection during iteration can skip neighbours; a new list avoids that interaction.',
    ],
    misconception: 'shared-mutation-or-lookup-contract',
  },
  functions: {
    easy: [
      'Trace a returned value',
      'def increment(n):\n    return n + 1\nprint(increment(4))',
      '5',
    ],
    decision: [
      'A pricing helper should provide its result to another function. Which implementation supplies the value?',
      ['print(price)', 'return price', 'global price'],
      1,
      'Printing displays a value; returning makes it available to the caller.',
    ],
    medium: [
      'What integer is printed across these two calls?',
      'def add(x, values=[]):\n    values.append(x)\n    return len(values)\nadd(4)\nprint(add(9))',
      '2',
    ],
    patch: [
      'Replace the mutable default with the sentinel used by the guard. Enter only the missing token.',
      'def add(x, values=___):\n    if values is None:\n        values = []\n    values.append(x)\n    return values',
      ['None'],
      'None lets the function allocate a fresh list for each omitted argument.',
    ],
    hard: [
      "Complete the expression so this helper returns a new sorted list and preserves its caller's input. Enter an expression using items.",
      'def ordered(items):\n    return ___',
      ['sorted(items)', 'sorted( items )'],
      'sorted returns a new list; list.sort mutates and returns None.',
    ],
    workflow: [
      'Order a repair for a helper whose state leaks between calls.',
      [
        'Reproduce by calling the helper twice without an explicit list',
        'Locate the mutable default argument',
        'Use a None sentinel and allocate a fresh list inside the helper',
        'Verify independent omitted-argument calls and explicit-list behaviour',
      ],
      'Repeated calls expose state sharing; preserve the contract for explicit arguments too.',
    ],
    misconception: 'return-or-shared-default-contract',
  },
  errors: {
    easy: [
      'Identify the exception class. Enter its Python name.',
      'int("not-a-number")',
      'ValueError',
    ],
    decision: [
      'A parser should reject malformed numeric text without hiding unrelated bugs. Which exception should its conversion handler catch?',
      [
        'Exception around the entire program',
        'ValueError around int(text)',
        'No exception; return zero on every failure',
      ],
      1,
      'A narrow handler preserves unrelated failures and avoids silently inventing data.',
    ],
    medium: [
      'Enter the integer printed after cleanup.',
      'count = 0\ntry:\n    int("oops")\nexcept ValueError:\n    count += 1\nfinally:\n    count += 2\nprint(count)',
      '3',
    ],
    patch: [
      'Complete the specific exception class for a failed dictionary lookup.',
      'try:\n    value = row["required"]\nexcept ___:\n    report_missing()',
      ['KeyError'],
      'A missing dictionary key raises KeyError.',
    ],
    hard: [
      'Enter the single keyword that re-raises the current exception without replacing its traceback.',
      'try:\n    save_record()\nexcept OSError:\n    log_failure()\n    ___',
      ['raise'],
      'A bare raise propagates the original active exception.',
    ],
    workflow: [
      'Order a repair for a file import that leaks an open handle on failure.',
      [
        'Reproduce the failing import path',
        'Identify the handle opened outside guaranteed cleanup',
        'Use a context manager around file access',
        'Test both successful parsing and parsing failure',
      ],
      'The context manager closes the handle when the block exits, including on failure.',
    ],
    misconception: 'exception-scope-or-cleanup',
  },
  validation: {
    easy: ['Is an empty list truthy? Enter True or False.', 'bool([])', 'False'],
    decision: [
      'A quantity contract accepts integer zero but rejects None. Which input must remain valid?',
      ['None', '0', '"unknown"'],
      1,
      'Zero and absent data are different states.',
    ],
    medium: [
      "Trace Python's boolean/integer relationship. Enter True or False.",
      'isinstance(True, int)',
      'True',
    ],
    patch: [
      'Complete the exact-type check to reject booleans while accepting ordinary integers. Enter the type name.',
      'if type(quantity) is not ___:\n    raise ValueError("integer required")',
      ['int'],
      'bool subclasses int. An exact int type check rejects bool for this deliberately strict contract.',
    ],
    hard: [
      'Complete the comparison so zero is accepted and negative quantities are rejected. Enter only the missing operator.',
      'if quantity ___ 0:\n    raise ValueError("negative")',
      ['<'],
      'Reject values strictly below zero; rejecting <= 0 would discard a permitted boundary.',
    ],
    workflow: [
      'Order an atomic import that must reject a malformed batch without partial writes.',
      [
        'Read the batch without writing records',
        'Validate every record and collect errors',
        'Reject the batch if any record is invalid',
        'Commit the validated batch in one transaction',
      ],
      'Validate the whole batch before committing; a transaction protects the write boundary.',
    ],
    misconception: 'input-type-or-boundary-confusion',
  },
  testing: {
    easy: [
      'Trace an assertion. Enter True or False for the tested expression.',
      'len([]) == 0',
      'True',
    ],
    decision: [
      'A loop skipped the final record. Which regression case most directly detects the original defect?',
      [
        'Only test an empty list',
        'Check that the final record of a multi-record input is processed',
        'Assert the function has a helpful name',
      ],
      1,
      'A regression case must fail under the original defect and pass after its repair.',
    ],
    medium: [
      'How many loop iterations run in this boundary case? Enter an integer.',
      'runs = 0\nfor item in []:\n    runs += 1\nprint(runs)',
      '0',
    ],
    patch: [
      'Complete this expected result for the empty-input contract. Enter only the missing integer.',
      'def count_valid(rows):\n    return sum(1 for row in rows if row is not None)\n\nassert count_valid([]) == ___',
      ['0'],
      'The empty collection contains zero valid rows; derive the expected value from the contract.',
    ],
    hard: [
      'Complete the exception class for a negative-input test. Enter only the class name.',
      '# Contract: reject a negative quantity with ValueError\nwith pytest.raises(___):\n    validate_quantity(-1)',
      ['ValueError'],
      'The test names the promised failure class, rather than accepting any unrelated crash.',
    ],
    workflow: [
      'Order a trustworthy regression-test cycle for a repaired parser.',
      [
        'Specify expected behaviour from the input contract',
        'Write a focused failing case for the defect',
        'Make the smallest repair that satisfies the contract',
        'Run the regression case and neighbouring boundary cases',
      ],
      "An independently derived expectation avoids repeating the implementation's mistake in its test.",
    ],
    misconception: 'weak-or-circular-verification',
  },
};
const questions: Question[] = competencies.flatMap((c) => {
  const x = content[c.id];
  const base = {
    version: '1.0.0',
    competencyId: c.id,
    misconception: x.misconception,
    hint: 'Trace one concrete input, name the contract, and check the boundary. You can submit “I’m unsure”; hint-assisted responses remain labelled.',
    seconds: 90,
    context: 'SkillSetu engineering lab · original authored task',
    accessibility: { inputLabel: 'Your answer', codeLanguage: 'python' as const },
  };
  return [
    {
      ...base,
      id: `${c.id}-trace-1`,
      difficulty: 1 as const,
      type: 'prediction' as const,
      title: x.easy[0],
      prompt: 'Enter the exact value requested; no code execution is needed.',
      code: x.easy[1],
      expected: [x.easy[2]],
      explanation: `Tracing this expression gives ${x.easy[2]}.`,
    },
    {
      ...base,
      id: `${c.id}-decision-1`,
      difficulty: 1 as const,
      type: 'decision' as const,
      title: 'Choose a safe contract',
      prompt: x.decision[0],
      options: x.decision[1],
      correct: x.decision[2],
      explanation: x.decision[3],
    },
    {
      ...base,
      id: `${c.id}-trace-2`,
      difficulty: 2 as const,
      type: 'prediction' as const,
      title: 'Trace the behaviour',
      prompt: x.medium[0],
      code: x.medium[1],
      expected: [x.medium[2]],
      explanation: `The requested result is ${x.medium[2]}. Trace every operation, including state retained between calls.`,
    },
    {
      ...base,
      id: `${c.id}-patch-2`,
      difficulty: 2 as const,
      type: 'completion' as const,
      title: 'Repair the boundary',
      prompt: x.patch[0],
      code: x.patch[1],
      expected: x.patch[2],
      explanation: x.patch[3],
    },
    {
      ...base,
      id: `${c.id}-patch-3`,
      difficulty: 3 as const,
      type: 'completion' as const,
      title: 'Apply the contract',
      prompt: x.hard[0],
      code: x.hard[1],
      expected: x.hard[2],
      explanation: x.hard[3],
    },
    {
      ...base,
      id: `${c.id}-workflow-3`,
      difficulty: 3 as const,
      type: 'ordering' as const,
      title: 'Plan a safe repair',
      prompt: x.workflow[0],
      steps: x.workflow[1].map((text, i) => ({ id: `s${i}`, text })).reverse(),
      order: x.workflow[1].map((_, i) => `s${i}`),
      explanation: x.workflow[2],
      seconds: 120,
    },
  ];
});
export const pythonDiagnostic: Bank = {
  id: 'python-adaptive-1.0.0',
  version: '1.0.0',
  roleId: 'python-developer',
  roleName: 'Python Developer',
  policy: { minimum: 18, target: 24, maximum: 30, coverage: 3 },
  competencies,
  questions,
};
