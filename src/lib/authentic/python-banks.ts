// Private authored rubrics. Import from server/service/tests only; never from client components.
import { pythonTopics } from '../tracks/python-topics';
import type { AssessmentBank, AuthenticTask, CodeCase, RepairModule, Rubric } from './types';
const version = 'python-authentic-v2';
const contexts = [
  ['Northstar fulfilment', 'supplier reconciliation', 'dispatch audit', 'refund notifications'],
  ['Harbor reservations', 'availability integration', 'guest import', 'payment reconciliation'],
  ['Relay subscriptions', 'renewal gateway', 'support log ingestion', 'warehouse returns'],
  ['Atlas clinic scheduling', 'appointment webhook', 'roster import', 'invoice audit'],
  ['Cedar ticketing', 'ticket API', 'event import', 'cancellation processing'],
];
const concepts: Record<string, [string[], string[], string[]]> = {
  fundamentals: [
    ['zero', 'positive', 'negative'],
    ['none', 'missing', 'boolean'],
    ['boundary', 'branch', 'loop'],
  ],
  functions: [
    ['return', 'output', 'contract'],
    ['input', 'parameter', 'argument'],
    ['pure', 'side effect', 'global'],
  ],
  structures: [
    ['dictionary', 'dict', 'key'],
    ['set', 'unique', 'duplicate'],
    ['order', 'lookup', 'list'],
  ],
  comprehensions: [
    ['filter', 'condition'],
    ['new list', 'copy', 'original'],
    ['iteration', 'loop', 'mutation'],
  ],
  modules: [
    ['virtual environment', 'venv', 'isolate'],
    ['pinned', 'version', 'dependencies'],
    ['main guard', 'import', 'side effect'],
  ],
  oop: [
    ['composition', 'dependency', 'inject'],
    ['state', 'instance', 'invariant'],
    ['interface', 'responsibility', 'contract'],
  ],
  exceptions: [
    ['specific', 'exception', 'valueerror'],
    ['fallback', 'recover', 'propagate'],
    ['cause', 'context', 'log'],
  ],
  files: [
    ['json', 'csv', 'parse'],
    ['schema', 'validate', 'malformed'],
    ['encoding', 'close', 'context manager'],
  ],
  debugging: [
    ['reproduce', 'reproduction', 'input'],
    ['trace', 'hypothesis', 'observe'],
    ['regression', 'test', 'verify'],
  ],
  testing: [
    ['boundary', 'empty', 'invalid'],
    ['assert', 'expected', 'outcome'],
    ['mock', 'isolate', 'deterministic'],
  ],
  http: [
    ['status', 'timeout', 'response'],
    ['schema', 'json', 'contract'],
    ['retry', 'idempotent', 'reconcile'],
  ],
  sql: [
    ['parameter', 'placeholder', 'bound'],
    ['transaction', 'atomic', 'rollback'],
    ['injection', 'untrusted', 'input'],
  ],
  quality: [
    ['extract', 'function', 'responsibility'],
    ['name', 'readable', 'contract'],
    ['test', 'behavior', 'regression'],
  ],
  reasoning: [
    ['linear', 'lookup', 'set'],
    ['complexity', 'scale', 'input'],
    ['measure', 'profile', 'tradeoff'],
  ],
  clarification: [
    ['requirement', 'contract', 'expected'],
    ['invalid', 'boundary', 'duplicate'],
    ['stakeholder', 'confirm', 'clarify'],
  ],
  communication: [
    ['impact', 'failure', 'affected'],
    ['evidence', 'measured', 'tested'],
    ['limitation', 'uncertainty', 'next step'],
  ],
  validation: [
    ['validate', 'boundary', 'invalid'],
    ['service', 'business', 'contract'],
    ['save', 'side effect', 'reject'],
  ],
};
const orders: Record<string, string[]> = {
  fundamentals: [
    'Write the input contract, including zero and missing values',
    'Trace one boundary input through the branches',
    'Implement the explicit condition',
    'Verify empty, normal and invalid inputs',
  ],
  functions: [
    'Identify caller inputs and required output',
    'Separate calculation from persistence',
    'Extract a pure function with explicit parameters',
    'Verify return values and absence of side effects',
  ],
  structures: [
    'List ordering, uniqueness and lookup requirements',
    'Choose list, dictionary and set responsibilities',
    'Implement updates without dropping source records',
    'Verify duplicate IDs and preserved order',
  ],
  comprehensions: [
    'Record the source collection and output contract',
    'Choose an explicit filter and transformation',
    'Build a new collection instead of mutating iteration',
    'Verify the original input is unchanged',
  ],
  modules: [
    'Reproduce the interpreter and dependency versions',
    'Create an isolated project environment',
    'Install pinned dependencies and guard CLI execution',
    'Verify module imports without running the CLI',
  ],
  oop: [
    'Identify state invariants and caller responsibilities',
    'Define the dependency contract',
    'Inject dependencies using composition',
    'Test each instance without real external services',
  ],
  exceptions: [
    'Identify the specific failure and expected recovery',
    'Catch the narrow expected exception',
    'Preserve the cause and supply a controlled outcome',
    'Test failure and success paths separately',
  ],
  files: [
    'Confirm file format, encoding and required fields',
    'Parse using a context manager',
    'Validate schema and retain rejected-row evidence',
    'Verify malformed and empty files without partial writes',
  ],
  debugging: [
    'Reproduce the failure with the smallest input',
    'Read the trace and form a testable hypothesis',
    'Repair the demonstrated cause',
    'Run regression and boundary checks',
  ],
  testing: [
    'Write the observable input/output contract',
    'List normal, empty and invalid cases',
    'Isolate the external dependency',
    'Assert outcomes and absence of unwanted writes',
  ],
  http: [
    'Confirm status and JSON response contract',
    'Set a bounded timeout and inspect status',
    'Validate decoded fields before use',
    'Reconcile ambiguous outcomes before a safe retry',
  ],
  sql: [
    'Validate the business operation and inputs',
    'Bind values to query placeholders',
    'Execute related writes in one transaction',
    'Verify commit or rollback using failure cases',
  ],
  quality: [
    'Capture current behavior in regression checks',
    'Identify one responsibility to extract',
    'Replace duplication with a named function',
    'Verify callers still meet the same contract',
  ],
  reasoning: [
    'Describe input size and required output',
    'Estimate repeated lookup cost',
    'Replace repeated scans with a suitable index',
    'Measure the change and verify equivalent results',
  ],
  clarification: [
    'Identify the decision the stakeholder needs',
    'Ask about boundary and duplicate behavior',
    'Confirm the agreed acceptance contract',
    'Implement and test the confirmed requirements',
  ],
  communication: [
    'Establish the affected users and impact',
    'Gather measured failure and test evidence',
    'State remaining uncertainty honestly',
    'Recommend an owner and next verification step',
  ],
  validation: [
    'Confirm request and business invariants',
    'Reject invalid input at the boundary',
    'Call the service with validated values',
    'Verify invalid input caused no persistence',
  ],
};
function rubric(key: string): Rubric {
  return concepts[key].map((terms, i) => ({
    label: ['Core principle', 'Contract and risk', 'Verification or limitation'][i],
    concepts: terms,
    weight: 1,
  }));
}
export function codingSpec(
  key: string,
  variant: number,
  transfer = false,
): { prompt: string; starter: string; functionName: string; cases: CodeCase[] } | undefined {
  const amount = variant + (transfer ? 4 : 1);
  const prefix = transfer ? 'event' : 'record';
  const field = ['quantity', 'nights', 'months', 'slots', 'tickets'][variant % 5];
  const basic = (prompt: string, cases: CodeCase[], broken: string) => ({
    prompt,
    cases,
    functionName: 'solve',
    starter: broken,
  });
  switch (key) {
    case 'fundamentals':
    case 'validation':
      return basic(
        `Implement solve(value). Return value * ${amount} for a positive integer, otherwise return None. Booleans, missing values, zero and negatives are invalid. Do not coerce strings.`,
        [
          { args: [2], expected: 2 * amount },
          { args: [0], expected: null },
          { args: [-2], expected: null },
          { args: [null], expected: null },
          { args: [true], expected: null },
          { args: ['2'], expected: null },
        ],
        'def solve(value):\n    # Repair the input contract before calculating.\n    return value\n',
      );
    case 'functions':
    case 'quality':
      return basic(
        `Implement a pure solve(price, ${field}). Return their product when price is a non-negative number and ${field} is a positive integer. Return None for invalid inputs, including booleans. Do not print, persist or use global state.`,
        [
          { args: [amount, 3], expected: amount * 3 },
          { args: [0, 1], expected: 0 },
          { args: [-1, 2], expected: null },
          { args: [2, 0], expected: null },
          { args: [null, 1], expected: null },
          { args: [2, true], expected: null },
        ],
        `def solve(price, ${field}):\n    # Complete validation and return the result.\n    return None\n`,
      );
    case 'structures':
    case 'reasoning':
      return basic(
        `Implement solve(rows). Rows contain ${prefix}_id and amount. Keep the first occurrence of each ID, in arrival order, and return a list of their amounts. IDs are strings; do not modify rows. Aim for linear work.`,
        [
          {
            args: [
              [
                { [prefix + '_id']: 'B', amount },
                { [prefix + '_id']: 'A', amount: 3 },
                { [prefix + '_id']: 'B', amount: 8 },
              ],
            ],
            expected: [amount, 3],
          },
          { args: [[]], expected: [] },
          { args: [[{ [prefix + '_id']: '0', amount: 0 }]], expected: [0] },
        ],
        'def solve(rows):\n    # Preserve arrival order while avoiding repeated scans.\n    return []\n',
      );
    case 'comprehensions':
      return basic(
        `Implement solve(rows). Return the ${field} values greater than zero from dictionaries containing that key. Skip missing, non-integer and boolean values. Preserve order and leave rows unchanged.`,
        [
          {
            args: [[{ [field]: 2 }, { [field]: 0 }, { [field]: -1 }, { [field]: amount }]],
            expected: [2, amount],
          },
          { args: [[{}, { [field]: true }, { [field]: '3' }]], expected: [] },
          { args: [[]], expected: [] },
        ],
        'def solve(rows):\n    for row in rows:\n        if not row:\n            rows.remove(row)\n    return rows\n',
      );
    case 'exceptions':
      return basic(
        `Implement solve(text). Parse a base-10 integer from a string, add ${amount}, and return the result. Return None for ValueError or TypeError. Do not mask unrelated failures.`,
        [
          { args: ['12'], expected: 12 + amount },
          { args: ['0'], expected: amount },
          { args: ['bad'], expected: null },
          { args: [null], expected: null },
          { args: ['-3'], expected: -3 + amount },
        ],
        `def solve(text):\n    return int(text) + ${amount}\n`,
      );
    case 'files':
      return basic(
        `Implement solve(text). Decode a JSON list of records and return the number of records containing a non-empty string ${prefix}_id. Return None for malformed JSON or a non-list top-level value. Other invalid rows are skipped.`,
        [
          {
            args: [
              JSON.stringify([
                { [prefix + '_id']: 'a' },
                { [prefix + '_id']: '' },
                null,
                { [prefix + '_id']: 'b' },
              ]),
            ],
            expected: 2,
          },
          { args: ['[]'], expected: 0 },
          { args: ['{bad'], expected: null },
          { args: ['{}'], expected: null },
        ],
        'import json\n\ndef solve(text):\n    # Parse, check shape, then count valid records.\n    return None\n',
      );
    case 'debugging':
      return basic(
        `Repair solve(values). Return a NEW list with only positive integer values multiplied by ${amount}. Ignore booleans and other types; preserve the input list and its order. The existing code skips entries while removing them.`,
        [
          { args: [[0, -1, 2, 3]], expected: [2 * amount, 3 * amount] },
          { args: [[]], expected: [] },
          { args: [[true, '2', null, 1]], expected: [amount] },
        ],
        `def solve(values):\n    for value in values:\n        if not value:\n            values.remove(value)\n    return values\n`,
      );
    case 'testing':
      return basic(
        `Implement solve(value) as the test oracle for a request validator: return "valid" only for integers from 1 through ${amount + 5}, inclusive, and "invalid" otherwise. Cover both boundaries and reject booleans and coercions.`,
        [
          { args: [1], expected: 'valid' },
          { args: [amount + 5], expected: 'valid' },
          { args: [0], expected: 'invalid' },
          { args: [amount + 6], expected: 'invalid' },
          { args: [true], expected: 'invalid' },
          { args: ['1'], expected: 'invalid' },
        ],
        'def solve(value):\n    # Express both bounds explicitly.\n    return "valid"\n',
      );
    case 'http':
      return basic(
        `Implement solve(response). response is a dictionary with status and body. Return body["${field}"] only for status 200 and an integer value >= 0 (reject bool). Return None for all other shapes or statuses. No real network call is required.`,
        [
          { args: [{ status: 200, body: { [field]: amount } }], expected: amount },
          { args: [{ status: 200, body: { [field]: 0 } }], expected: 0 },
          { args: [{ status: 503, body: { [field]: 3 } }], expected: null },
          { args: [{ status: 200, body: null }], expected: null },
          { args: [{ status: 200, body: { [field]: true } }], expected: null },
        ],
        `def solve(response):\n    return response["body"]["${field}"]\n`,
      );
    case 'oop':
      return basic(
        `Implement solve(amounts). Use an instance of an Account class with initial balance ${amount}; add each non-negative integer in amounts and return its balance. Ignore booleans and invalid values. Separate instances must not share balance.`,
        [
          { args: [[2, 3]], expected: amount + 5 },
          { args: [[]], expected: amount },
          { args: [[-2, true, '3', 0]], expected: amount },
        ],
        'class Account:\n    def __init__(self, balance):\n        self.balance = balance\n\ndef solve(amounts):\n    # Compose the calculation with instance-owned state.\n    return None\n',
      );
    default:
      return undefined;
  }
}
function buildBank(index: number): AssessmentBank {
  const bankId = `py-${index < 2 ? 'baseline' : 'verify'}-${index < 2 ? index + 1 : index - 1}-v2.2`;
  const scenarioIds = contexts[index].map((_, i) => `${bankId}-case-${i + 1}`);
  const scenarios = contexts[index].map((name, i) => ({
    id: scenarioIds[i],
    title: name,
    stakeholder: ['Mira Chen', 'Arjun Rao', 'Leah Park', 'Sam Ali'][i],
    stakeholderRole: ['Engineering lead', 'Integration owner', 'Operations manager', 'Client lead'][
      i
    ],
    company: `${['Northstar', 'Harbor', 'Relay', 'Atlas', 'Cedar'][index]} · fictional workplace`,
    brief: `The ${name} workflow needs a safe change. Show your reasoning, implement the contract and verify the result. We will add constraints based on your response.`,
  }));
  const tasks: AuthenticTask[] = [];
  for (let phase = 0; phase < 4; phase++)
    for (const [topicIndex, topic] of pythonTopics.entries()) {
      const id = `${bankId}-${topic.key}-${phase}`;
      const spec = codingSpec(topic.key, index, phase === 3);
      const check = topic.checks[(index + phase) % topic.checks.length];
      const rotated = (topicIndex + index) % 3;
      const options = [check[1], check[2], check[3]];
      const mappings = [{ skillId: `py-${topic.key}`, weight: 2 }];
      // Explicit secondary evidence: verify input contracts, test code repair, and explain tradeoffs.
      const secondary =
        phase === 1 && ['fundamentals', 'exceptions', 'http', 'files'].includes(topic.key)
          ? 'validation'
          : phase === 1 && ['functions', 'debugging', 'structures', 'quality'].includes(topic.key)
            ? 'testing'
            : phase === 2 && ['exceptions', 'http', 'files', 'validation'].includes(topic.key)
              ? 'debugging'
              : phase === 3 &&
                  ['structures', 'comprehensions', 'quality', 'functions'].includes(topic.key)
                ? 'reasoning'
                : phase === 1 && ['quality', 'oop', 'validation', 'exceptions'].includes(topic.key)
                  ? 'functions'
                  : undefined;
      if (secondary && secondary !== topic.key)
        mappings.push({ skillId: `py-${secondary}`, weight: 1 });
      const extra =
        phase === 2 && ['functions', 'validation', 'http'].includes(topic.key)
          ? 'exceptions'
          : phase === 1 && ['modules', 'files'].includes(topic.key)
            ? 'functions'
            : phase === 3 && ['debugging', 'testing', 'reasoning'].includes(topic.key)
              ? 'structures'
              : undefined;
      if (extra && extra !== topic.key && extra !== secondary)
        mappings.push({ skillId: `py-${extra}`, weight: 1 });
      const task: AuthenticTask = {
        id,
        type:
          phase === 0
            ? 'decision'
            : phase === 2
              ? 'ordered-steps'
              : phase === 3
                ? 'transfer'
                : spec
                  ? topic.key === 'debugging' ||
                    topic.key === 'comprehensions' ||
                    topic.key === 'http'
                    ? 'bug-fix'
                    : 'code-edit'
                  : 'short-answer',
        scenario: scenarioIds[phase],
        title: topic.name,
        context: `${contexts[index][phase]}: ${topic.concept} ${phase === 3 ? 'This is an independent transfer task in a different workflow.' : ''}`,
        prompt:
          phase === 0
            ? `${contexts[index][phase]} — ${check[0]}`
            : phase === 2
              ? `Order the ${topic.name.toLowerCase()} workflow before approving ${contexts[index][phase]}.`
              : spec
                ? spec.prompt
                : `For ${contexts[index][phase]}, explain how you would apply ${topic.name.toLowerCase()}. Address the core principle, the contract or risk, and the verification or limitation. Use a concrete example, not a list of keywords.`,
        minutes: spec && phase !== 0 && phase !== 2 ? 3 : 1,
        skillIds: mappings,
        transfer: phase === 3,
        // Every assessment response is unaided; guided opportunities live in repair modules.
        independent: true,
        explanation: phase === 0 ? check[4] : `${topic.concept} ${topic.intuition}`,
        branch: {
          strong: `Requirement clarified — ${contexts[index][phase]} can proceed. New constraint: preserve the original input and prove failure paths leave no partial write.`,
          developing: `Evidence received — part of the contract is covered. New failure evidence: an empty input was accepted without validation; verify the boundary before rollout.`,
          risk: `Risk identified — ${contexts[index][phase]} has an unsafe assumption. New failure evidence: a duplicate or malformed input reached the downstream service. Reproduce it before rollout.`,
        },
        followup: {
          strong: 'Stakeholder constraint: also preserve the audit trail when the operation fails.',
          risk: 'Stakeholder evidence: the latest failure involved missing input; diagnose that before optimizing.',
        },
      };
      if (phase === 0) {
        task.options = [...options.slice(rotated), ...options.slice(0, rotated)];
        task.correct = (3 - rotated) % 3;
      } else if (phase === 2) {
        task.order = orders[topic.key].map((_, i) => `${topic.key}-step-${i}`);
        task.steps = orders[topic.key].map((text, i) => ({ id: task.order![i], text })).reverse();
      } else if (spec) Object.assign(task, spec);
      else task.rubric = rubric(topic.key);
      tasks.push(task);
    }
  return {
    id: bankId,
    roleId: 'python-developer',
    kind: index < 2 ? 'diagnostic' : 'reassessment',
    version,
    contentVersion: '2026-10-02.3',
    title: `${index < 2 ? 'Baseline' : 'Reassessment'} · ${contexts[index][0]}`,
    scenarios,
    tasks,
  };
}
export const pythonBanks = [0, 1, 2, 3, 4].map(buildBank);
export const pythonRepairs: RepairModule[] = pythonTopics.map((topic, index) => {
  const sources = [
    pythonBanks[0].tasks[index],
    pythonBanks[0].tasks[17 + index],
    pythonBanks[1].tasks[17 + index],
    pythonBanks[2].tasks[17 + index],
    pythonBanks[2].tasks[34 + index],
    pythonBanks[3].tasks[51 + index],
  ];
  return {
    id: `repair-${topic.key}-v2.2`,
    skillId: `py-${topic.key}`,
    version: 'repair-v2.2',
    title: topic.name,
    minutes: 35,
    concept: topic.concept,
    intuition: topic.intuition,
    example: topic.example,
    interview: `Explain a failure caused by ${topic.name.toLowerCase()}, how you would reproduce it, and how you would verify the repair.`,
    workplace: `Repair a small ${contexts[3][index % 4]} workflow using ${topic.name.toLowerCase()}; include normal and failure-path checks.`,
    tasks: sources.map((t, i) => ({
      ...t,
      id: `repair-${topic.key}-${i}-v2`,
      title: [
        'Guided problem',
        'Independent problem',
        'Harder application',
        'Mini workplace task',
        'Verification strategy',
        'Transfer challenge',
      ][i],
      context: `${['Guided: use the worked example, then explain each step.', 'Independent: use explicit inputs and outputs.', 'Harder application: include missing and boundary inputs.', 'Workplace: preserve source records and report rejected inputs.', 'Verify the repair before rollout.', 'Transfer: apply the principle in another workflow.'][i]} ${t.context}`,
      transfer: i === 5,
      independent: i > 0,
    })),
  };
});
