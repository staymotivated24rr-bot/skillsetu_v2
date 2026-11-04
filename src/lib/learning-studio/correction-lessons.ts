// Original instructional content, independent of every diagnostic bank.
import type { LessonContent, LessonStep } from './content';
const step = (s: Omit<LessonStep, 'accessibility'>): LessonStep => ({
  ...s,
  phase: s.id.includes('explore')
    ? 'Explore'
    : s.id.includes('review')
      ? 'Review'
      : s.kind === 'mastery'
        ? 'Verify'
        : s.id.includes('apply') || s.id === 'manifest-repair'
          ? 'Apply'
          : s.kind === 'explanation'
            ? 'Explain'
            : s.kind === 'prediction' || s.kind === 'numeric'
              ? 'Predict'
              : 'Practice',
  accessibility: { label: s.title, description: s.objective },
});
const explain = (
  id: string,
  title: string,
  instruction: string,
  visual?: LessonStep['visual'],
): LessonStep =>
  step({
    id,
    kind: 'explanation',
    title,
    instruction,
    objective: title,
    visual,
    hint: 'Follow one change at a time.',
    key: { acknowledged: true },
    feedback: {
      correct: 'Ready for the next small experiment.',
      incorrect: 'Confirm that you explored this idea.',
    },
  });
const predict = (
  id: string,
  title: string,
  code: string,
  expected: string,
  hint: string,
): LessonStep =>
  step({
    id,
    kind: 'prediction',
    title,
    code,
    instruction: 'Predict the printed integer before checking.',
    objective: title,
    independent: true,
    responseFormat: 'integer',
    hint,
    hints: [hint, 'Write the value after each executed statement, then read only the final print.'],
    key: { text: expected },
    feedback: {
      correct: 'Your trace matches. Keep that reasoning for the next case.',
      incorrect: 'Trace each statement again; a later change does not undo an earlier one.',
    },
  });
const base = {
  version: '1.0.0-draft.1',
  schemaVersion: 1 as const,
  roleId: 'python-developer' as const,
  evaluatorVersion: 'studio-contracts-2',
  progressiveDisclosure: true as const,
  prerequisites: [],
  prerequisiteLabels: ['Read a short sequence of Python statements'],
};

export const loopsLesson: LessonContent = {
  ...base,
  id: 'python-loop-boundaries',
  title: 'Loops: every item, exactly once',
  summary: 'Move through a loop, track its state, then repair a real boundary.',
  objectives: [
    'Trace a running total.',
    'Explain the exclusive stop of range.',
    'Check empty and one-item inputs.',
    'Repair an off-by-one boundary.',
  ],
  masteryPolicy: {
    version: 'lesson-mastery-1',
    checkpoints: ['loop-predict', 'loop-empty', 'loop-repair'],
    required: 2,
    finalStepId: 'loop-verify',
  },
  steps: [
    explain(
      'loop-explain',
      'One item, one visit',
      'A for loop takes one item at a time. Initialize shared state before the loop; update it inside.',
      {
        label: 'A running-total path',
        cards: [
          { label: 'Start', value: 'total = 0' },
          { label: 'Visit', value: 'each reading once' },
          { label: 'Update', value: 'add this reading' },
        ],
      },
    ),
    step({
      ...explain(
        'loop-explore',
        'Move the state forward',
        'Use Next statement to inspect each update. This is an authored visualization, not executed Python.',
      ),
      referenceFrames: [
        {
          statement: 'total = 0',
          explanation: 'Initialize once.',
          names: [{ name: 'total', objectId: 'A' }],
          objects: [{ id: 'A', value: '0', mutable: false }],
        },
        {
          statement: 'total += 3',
          explanation: 'The first reading changes total from 0 to 3.',
          names: [{ name: 'total', objectId: 'B' }],
          objects: [{ id: 'B', value: '3', mutable: false }],
        },
        {
          statement: 'total += 5',
          explanation: 'The next reading changes total from 3 to 8.',
          names: [{ name: 'total', objectId: 'C' }],
          objects: [{ id: 'C', value: '8', mutable: false }],
        },
      ],
    }),
    predict(
      'loop-predict',
      'Predict the accumulator',
      'total = 0\nfor reading in [4, 0, 3]:\n    total += reading\nprint(total)',
      '7',
      'Start at 0, then add 4, 0 and 3 in order.',
    ),
    predict(
      'loop-empty',
      'What if there are no items?',
      'total = 0\nfor reading in []:\n    total += reading\nprint(total)',
      '0',
      'The body is never entered; the initial total still exists.',
    ),
    step({
      id: 'loop-repair',
      kind: 'blocks',
      title: 'Include the last package',
      objective: 'Repair an exclusive stop.',
      independent: true,
      instruction:
        'Five packages have indices 0 through 4. Fill the stop so each index is visited once.',
      code: 'for index in range(___):\n    label(index)',
      slots: [
        {
          id: 'stop',
          label: 'Exclusive range stop',
          choices: [
            { id: 'four', code: '4' },
            { id: 'five', code: '5' },
            { id: 'six', code: '6' },
          ],
        },
      ],
      key: { blocks: { stop: 'five' } },
      hint: 'The stop itself is not visited.',
      hints: [
        'The stop itself is not visited.',
        'The desired indices end at 4, so the excluded stop is the next integer.',
      ],
      feedback: {
        correct: 'The range visits 0, 1, 2, 3 and 4.',
        incorrect: 'Count the visited indices, remembering the exclusive stop.',
      },
    }),
    step({
      id: 'loop-state',
      kind: 'trace',
      title: 'Keep the state across iterations',
      objective: 'Trace both names.',
      instruction: 'Enter total and the final reading after the loop.',
      code: 'total = 1\nfor reading in [2, 4]:\n    total += reading',
      cells: [
        { id: 'total', label: 'Final total' },
        { id: 'reading', label: 'Final reading' },
      ],
      key: { state: { total: '7', reading: '4' } },
      hint: 'total is initialized once, not once per item.',
      feedback: {
        correct: 'The accumulator survives between iterations; reading retains the last item.',
        incorrect: 'Start total at 1 and update it twice.',
      },
    }),
    explain(
      'loop-apply',
      'Test the boundary, not just the middle',
      'For a labeling loop, check an empty batch, one package and several packages. Ask whether each package is visited once and whether the loop ever invents an extra index.',
    ),
    step({
      id: 'loop-verify',
      kind: 'mastery',
      title: 'Independent boundary check',
      objective: 'Apply the loop contract to an unseen batch.',
      independent: true,
      instruction: 'Predict the printed count and total. Submit both together without hints.',
      code: 'count = 0\ntotal = 0\nfor value in range(2, 6):\n    count += 1\n    total += value\nprint(count, total)',
      cells: [
        { id: 'count', label: 'Number of visits' },
        { id: 'total', label: 'Final total' },
      ],
      key: { state: { count: '4', total: '14' } },
      masteryVariants: [
        {
          code: 'count = 0\ntotal = 0\nfor value in range(2, 6):\n    count += 1\n    total += value\nprint(count, total)',
          key: { state: { count: '4', total: '14' } },
        },
        {
          code: 'count = 0\ntotal = 0\nfor value in range(3, 6):\n    count += 1\n    total += value\nprint(count, total)',
          key: { state: { count: '3', total: '12' } },
        },
        {
          code: 'count = 0\ntotal = 0\nfor value in range(4, 4):\n    count += 1\n    total += value\nprint(count, total)',
          key: { state: { count: '0', total: '0' } },
        },
      ],
      hint: 'The independent check has no hints.',
      feedback: {
        correct: 'You applied the exclusive-stop rule and tracked two names together.',
        incorrect:
          'A boundary or state prediction differs. The first attempt is preserved; use the earlier examples before retrying.',
      },
    }),
  ],
};

export const divisionLesson: LessonContent = {
  ...base,
  id: 'python-values-division',
  title: 'Values, names, and division',
  summary: 'Predict a value and its type before choosing an operation.',
  objectives: [
    'Trace assignment and rebinding.',
    'Distinguish / from // for integer operands.',
    'Handle negative floor division.',
    'Apply the right operation to a practical contract.',
  ],
  masteryPolicy: {
    version: 'lesson-mastery-1',
    checkpoints: ['division-rebind', 'division-float', 'division-floor'],
    required: 2,
    finalStepId: 'division-verify',
  },
  steps: [
    explain(
      'division-explain',
      'A value has a type',
      'For the built-in int operands in this lesson, / returns a float. With //, the result is an int rounded down toward negative infinity.',
      {
        label: 'Choose the numeric contract',
        cards: [
          { label: 'Share exactly', value: '9 / 2 → float' },
          { label: 'Whole groups', value: '9 // 2 → int' },
        ],
      },
    ),
    step({
      ...explain(
        'division-explore',
        'Names can move independently',
        'Step through rebinding. Object labels are symbolic; this is an authored model.',
      ),
      referenceFrames: [
        {
          statement: 'stock = 9\nsaved = stock',
          explanation: 'Both names currently refer to 9.',
          names: [
            { name: 'stock', objectId: 'A' },
            { name: 'saved', objectId: 'A' },
          ],
          objects: [{ id: 'A', value: '9', mutable: false }],
        },
        {
          statement: 'stock = 12',
          explanation: 'Rebinding stock leaves saved at 9.',
          names: [
            { name: 'stock', objectId: 'B' },
            { name: 'saved', objectId: 'A' },
          ],
          objects: [
            { id: 'A', value: '9', mutable: false },
            { id: 'B', value: '12', mutable: false },
          ],
        },
      ],
    }),
    predict(
      'division-rebind',
      'Read the saved value',
      'stock = 9\nsaved = stock\nstock = 12\nprint(saved)',
      '9',
      'Only stock is rebound on the third line.',
    ),
    step({
      id: 'division-float',
      kind: 'numeric',
      title: 'Share without discarding the fraction',
      objective: 'Use true division.',
      independent: true,
      instruction: 'Enter the result with exactly one decimal place.',
      code: 'print(13 / 2)',
      numeric: { kind: 'float', places: 1 },
      key: { text: '6.5' },
      hint: 'True division retains the fractional part.',
      feedback: {
        correct: '13 / 2 is 6.5, a float.',
        incorrect: 'Use / rather than discarding the fractional part.',
      },
    }),
    predict(
      'division-floor',
      'Floor means down, even below zero',
      'print(-13 // 2)',
      '-7',
      'The floor is the greatest integer less than or equal to -6.5: move toward negative infinity.',
    ),
    step({
      id: 'division-repair',
      kind: 'blocks',
      title: 'Choose a whole-group contract',
      objective: 'Apply floor division to positive quantities.',
      instruction:
        'A rack holds four boxes. Count complete racks from a nonnegative integer box count.',
      code: 'complete_racks = boxes ___ 4',
      slots: [
        {
          id: 'operation',
          label: 'Division operation',
          choices: [
            { id: 'true', code: '/' },
            { id: 'floor', code: '//' },
            { id: 'remainder', code: '%' },
          ],
        },
      ],
      key: { blocks: { operation: 'floor' } },
      hint: 'Only complete groups count here.',
      hints: [
        'Only complete groups count here.',
        'Use the operation that floors the quotient for these positive integer operands.',
      ],
      feedback: {
        correct: 'Floor division counts complete groups; the remainder describes leftover boxes.',
        incorrect:
          'Match the operation to complete groups, rather than an exact share or remainder.',
      },
    }),
    explain(
      'division-apply',
      'Specify the representation',
      'A price share and a count of full racks have different contracts. Specify both the value and the expected type; do not silently truncate an exact share.',
    ),
    step({
      id: 'division-verify',
      kind: 'mastery',
      title: 'Independent numeric contract',
      objective: 'Apply division without assistance.',
      independent: true,
      instruction:
        'Enter the full-group count as an integer and the exact share with exactly one decimal place.',
      code: 'boxes = 15\nprint(boxes // 2, boxes / 2)',
      cells: [
        { id: 'groups', label: 'Complete groups' },
        {
          id: 'share',
          label: 'Exact share (float, one decimal place)',
          format: 'float',
          places: 1,
        },
      ],
      key: { state: { groups: '7', share: '7.5' } },
      masteryVariants: [
        {
          code: 'boxes = 15\nprint(boxes // 2, boxes / 2)',
          key: { state: { groups: '7', share: '7.5' } },
        },
        {
          code: 'boxes = 19\nprint(boxes // 2, boxes / 2)',
          key: { state: { groups: '9', share: '9.5' } },
        },
        {
          code: 'boxes = 10\nprint(boxes // 2, boxes / 2)',
          key: { state: { groups: '5', share: '5.0' } },
        },
      ],
      hint: 'The independent check has no hints.',
      feedback: {
        correct: 'Both operations match their contracts.',
        incorrect:
          'One numeric contract differs. Your first attempt remains recorded; review the operation before retrying.',
      },
    }),
  ],
};

const manifestCode =
  'def manifest(readings, capacity):\n    chosen = []\n    used = 0\n    for index, value in enumerate(readings):\n        if ___:\n            continue\n        if ___:\n            continue\n        chosen.append(___)\n        used += value\n    return [chosen, used]';
const application = (readings: string, cap: number) =>
  'readings = ' +
  readings +
  '\ncapacity = ' +
  cap +
  '\nchosen = []\nused = 0\nfor index, value in enumerate(readings):\n    if type(value) is not int or value < 0:\n        continue\n    if used + value > capacity:\n        continue\n    chosen.append(index)\n    used += value\nprint(chosen, used)';
export const transferLesson: LessonContent = {
  ...base,
  id: 'python-transfer-manifest',
  title: 'Transfer challenge: build a dispatch manifest',
  summary: 'A new practical contract combining validation, iteration and collection decisions.',
  objectives: [
    'Translate a new contract into code.',
    'Reject booleans without rejecting zero.',
    'Account for capacity across a whole sequence.',
    'Verify a different boundary case independently.',
  ],
  masteryPolicy: {
    version: 'lesson-mastery-1',
    checkpoints: ['manifest-repair'],
    required: 1,
    finalStepId: 'manifest-verify',
  },
  steps: [
    explain(
      'manifest-brief',
      'Your dispatch brief',
      'Scan readings in order. Accept only nonnegative built-in int values, excluding bool. Record an index when adding its value would stay within capacity. Skip invalid or oversized values and keep scanning; zero is valid. Return the chosen indices and total used. This task samples several skills; it does not certify all Python areas.',
    ),
    step({
      id: 'manifest-repair',
      kind: 'blocks',
      title: 'Apply the contract to a new task',
      objective: 'Independently repair three decisions.',
      independent: true,
      instruction: 'Fill all three blanks. Use the contract; no worked solution has been shown.',
      code: manifestCode,
      slots: [
        {
          id: 'valid',
          label: 'Invalid-value guard',
          choices: [
            { id: 'exact', code: 'type(value) is not int or value < 0' },
            { id: 'truthy', code: 'not value' },
            { id: 'broad', code: 'not isinstance(value, int)' },
          ],
        },
        {
          id: 'cap',
          label: 'Capacity guard',
          choices: [
            { id: 'sum', code: 'used + value > capacity' },
            { id: 'item', code: 'value > capacity' },
            { id: 'equal', code: 'used + value >= capacity' },
          ],
        },
        {
          id: 'record',
          label: 'Record the accepted position',
          choices: [
            { id: 'index', code: 'index' },
            { id: 'value', code: 'value' },
            { id: 'used', code: 'used' },
          ],
        },
      ],
      key: { blocks: { valid: 'exact', cap: 'sum', record: 'index' } },
      hint: 'Read each contract clause independently.',
      hints: [
        'Read each contract clause independently.',
        'Check True, zero, an exact fit and an item that fits alone but not after earlier items.',
      ],
      feedback: {
        correct: 'Your repair handles type, accumulated capacity and position.',
        incorrect:
          'At least one contract clause differs. Contrast True with zero, and compare an exact fit with an overflow.',
      },
    }),
    step({
      id: 'manifest-verify',
      kind: 'mastery',
      title: 'Verify on a different batch',
      objective: 'Transfer the repair to unseen values.',
      independent: true,
      instruction:
        'Predict the chosen index list and total used. The code is now visible; answer before checking.',
      code: application('[0, 4, True, 2, -1]', 4),
      cells: [
        { id: 'indices', label: 'Chosen indices', format: 'literal' },
        { id: 'used', label: 'Total used' },
      ],
      key: { state: { indices: '[0, 1]', used: '4' } },
      masteryVariants: [
        {
          code: application('[0, 4, True, 2, -1]', 4),
          key: { state: { indices: '[0, 1]', used: '4' } },
        },
        {
          code: application('[3, 2, False, 0, 1]', 4),
          key: { state: { indices: '[0, 3, 4]', used: '4' } },
        },
        {
          code: application('[False, -2, 0, 1]', 0),
          key: { state: { indices: '[2]', used: '0' } },
        },
      ],
      hint: 'This independent check has no hints.',
      feedback: {
        correct: 'You transferred the contract to a fresh batch.',
        incorrect:
          'Trace accepted indices and accumulated usage separately. The first attempt is preserved.',
      },
    }),
    explain(
      'manifest-review',
      'Review the decisions that mattered',
      'The exact type guard separates bool from int. The capacity test uses the accumulated total. An overflow skips one item rather than ending the scan, so later zero or smaller values can still be accepted. Try a new practice run for a different final batch; no diagnostic result changes.',
    ),
  ],
};
