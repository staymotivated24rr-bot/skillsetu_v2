import { createHash } from 'node:crypto';
import { reviewedDiagnostic } from './reviewed-bank';
import type { Bank, Question } from './types';

type AuthoredSlot = { label: string; choices: [string, string, string] };
type Draft = {
  id: string;
  competencyId: string;
  difficulty: 2 | 3;
  subskill: string;
  title: string;
  prompt: string;
  code: string;
  slots: AuthoredSlot[];
  explanation: string;
  misconception: string;
  hint: string;
  difficultyReason: string;
};
// Original workplace tasks. In each authoring tuple the first choice is the key;
// publication rotates all choices and replaces positions with opaque stable IDs.
const drafts: Draft[] = [
  {
    id: 'values-boundary',
    competencyId: 'values',
    difficulty: 2,
    subskill: 'loop boundaries',
    title: 'Complete the dispatch filter',
    prompt:
      'Queue every ready row exactly once. Fill the loop boundary and the condition; do not skip the first row or read past the last one.',
    code: 'rows = ["draft", "ready", "held"]\nfor index in {{slot-1}}:\n    if rows[index] {{slot-2}}:\n        queue(rows[index])',
    slots: [
      {
        label: 'Loop boundary',
        choices: ['range(len(rows))', 'range(len(rows) + 1)', 'range(1, len(rows))'],
      },
      { label: 'Ready-row condition', choices: ['== "ready"', '!= "ready"', 'is not None'] },
    ],
    explanation:
      'range(len(rows)) visits each valid index, including zero. Equality selects only the ready rows; the other conditions admit unrelated rows or invalid indices.',
    misconception: 'possible-boundary-or-filter-confusion',
    hint: 'Track the first index, the excluded stop and one non-ready row separately.',
    difficultyReason: 'Coordinate an exclusive boundary with a state-dependent filter',
  },
  {
    id: 'values-retry',
    competencyId: 'values',
    difficulty: 3,
    subskill: 'branch tracing',
    title: 'Bound a retry worker',
    prompt:
      'Assume retry() returns normally and limit is a positive integer. Make the worker call retry() exactly limit times, with a counter that progresses toward the stop.',
    code: 'attempts = 0\nwhile {{slot-1}}:\n    retry()\n    attempts {{slot-2}}',
    slots: [
      {
        label: 'Retry guard',
        choices: ['attempts < limit', 'attempts <= limit', 'attempts > limit'],
      },
      { label: 'Counter update', choices: ['+= 1', '-= 1', '= 0'] },
    ],
    explanation:
      'The strict upper bound admits attempts 0 through limit - 1. Increasing the counter by one eventually makes the guard false; resetting or decreasing it can fail to terminate.',
    misconception: 'possible-nonprogressing-loop',
    hint: 'Compare the starting counter, the number of permitted calls and the direction of progress.',
    difficultyReason: 'Reason about both repeated side effects and loop termination',
  },
  {
    id: 'collections-lookup',
    competencyId: 'collections',
    difficulty: 2,
    subskill: 'dictionary access',
    title: 'Preserve an optional note',
    prompt:
      'Return an empty string when note is absent. Preserve every explicitly supplied value, including None and the empty string.',
    code: 'def display_note(row):\n    return {{slot-1}}',
    slots: [
      {
        label: 'Optional-key lookup',
        choices: ['row.get("note", "")', 'row["note"]', 'row.get("note")'],
      },
    ],
    explanation:
      'The explicit dict.get fallback applies only to an absent key. Direct indexing raises for absence; dict.get without a fallback produces None for absence.',
    misconception: 'possible-absence-versus-explicit-value-confusion',
    hint: 'Use one dictionary with no note key and another with note explicitly set to None.',
    difficultyReason: 'Distinguish absence from an explicit missing-value sentinel',
  },
  {
    id: 'collections-copy',
    competencyId: 'collections',
    difficulty: 3,
    subskill: 'aliasing',
    title: 'Sort a copy for a dashboard',
    prompt:
      'Return a new ascending list of integer IDs. The caller’s original list must keep its order.',
    code: 'def ranked_ids(items):\n    ranked = {{slot-1}}\n    {{slot-2}}\n    return ranked',
    slots: [
      { label: 'Working list', choices: ['list(items)', 'items', 'None'] },
      {
        label: 'Sorting operation',
        choices: ['ranked.sort()', 'ranked.sort(reverse=True)', 'items.sort()'],
      },
    ],
    explanation:
      'Copying the outer list creates independent ordering state. Sorting that copy produces ascending output while leaving the caller’s list untouched.',
    misconception: 'possible-in-place-mutation-or-aliasing',
    hint: 'Follow the object referenced by each name before considering which name is returned.',
    difficultyReason: 'Preserve a caller-side mutation contract while composing a repair',
  },
  {
    id: 'functions-default',
    competencyId: 'functions',
    difficulty: 2,
    subskill: 'default arguments',
    title: 'Choose an independent default',
    prompt:
      'Omitted-argument calls need fresh lists. If the caller supplies a list, including an empty list, append to that exact list.',
    code: 'def add_tag(tag, tags={{slot-1}}):\n    if tags {{slot-2}}:\n        tags = []\n    tags.append(tag)\n    return tags',
    slots: [
      { label: 'Default argument', choices: ['None', '[]', '""'] },
      { label: 'Sentinel guard', choices: ['is None', '== []', 'is not None'] },
    ],
    explanation:
      'A None default plus an identity guard allocates only when the argument is omitted. An empty-list equality guard would replace a list explicitly supplied by the caller.',
    misconception: 'possible-shared-default-or-empty-list-replacement',
    hint: 'Trace an omitted argument and an explicitly supplied empty list as two different calls.',
    difficultyReason: 'Track default lifetime and caller-provided object identity',
  },
  {
    id: 'functions-return',
    competencyId: 'functions',
    difficulty: 3,
    subskill: 'side effects',
    title: 'Return a safe appended copy',
    prompt:
      'value is a single integer. Return a new list with value appended once, while leaving the caller’s list untouched.',
    code: 'def append_copy(items, value):\n    updated = {{slot-1}}\n    {{slot-2}}\n    return {{slot-3}}',
    slots: [
      { label: 'Local list', choices: ['items.copy()', 'items', 'None'] },
      {
        label: 'Append operation',
        choices: ['updated.append(value)', 'items.append(value)', 'updated.extend(value)'],
      },
      { label: 'Returned value', choices: ['updated', 'items', 'None'] },
    ],
    explanation:
      'A copy isolates the caller, append accepts the single integer as one element, and returning updated exposes the new state instead of the original list or None.',
    misconception: 'possible-return-value-and-mutation-confusion',
    hint: 'Check which object changes and which object the function returns; these are separate promises.',
    difficultyReason: 'Coordinate object identity, a single-element update and the return contract',
  },
  {
    id: 'errors-narrow',
    competencyId: 'errors',
    difficulty: 2,
    subskill: 'exception scope',
    title: 'Keep unrelated failures visible',
    prompt:
      'raw is text. Use zero for invalid integer text, then persist the quantity once. Do not swallow unrelated exceptions.',
    code: 'try:\n    quantity = int(raw)\nexcept {{slot-1}}:\n    quantity = 0\n{{slot-2}}',
    slots: [
      { label: 'Conversion exception', choices: ['ValueError', 'Exception', 'KeyError'] },
      {
        label: 'After-conversion action',
        choices: ['persist(quantity)', 'pass', 'raise ValueError()'],
      },
    ],
    explanation:
      'Invalid integer text raises ValueError. The persistence action follows the narrow conversion handler, so persistence failures remain visible.',
    misconception: 'possible-broad-exception-swallowing',
    hint: 'Separate failure during conversion from failure during persistence.',
    difficultyReason:
      'Place a narrow handler around a conversion while preserving later failure behavior',
  },
  {
    id: 'errors-cleanup-v2',
    competencyId: 'errors',
    difficulty: 3,
    subskill: 'cleanup',
    title: 'Release a resource on both paths',
    prompt:
      'Assume close() returns normally. Always close the acquired resource, whether transform returns or raises. Preserve its return value and propagate its exception.',
    code: 'def transformed_value():\n    resource = acquire()\n    try:\n        return transform(resource)\n    {{slot-1}}:\n        {{slot-2}}',
    slots: [
      { label: 'Cleanup clause', choices: ['finally', 'except ValueError', 'except Exception'] },
      { label: 'Cleanup action', choices: ['resource.close()', 'return None', 'acquire()'] },
    ],
    explanation:
      'A finally clause executes on both return and exception paths. Closing the resource there performs cleanup without replacing the return value or swallowing the original failure.',
    misconception: 'possible-cleanup-path-or-return-override',
    hint: 'Walk through a normal return and an exception as separate control-flow paths.',
    difficultyReason: 'Preserve return and exception behavior across mandatory cleanup',
  },
  {
    id: 'validation-kind',
    competencyId: 'validation',
    difficulty: 2,
    subskill: 'boolean rejection',
    title: 'Validate a nonnegative quantity',
    prompt:
      'Accept zero and positive Python integers. Reject booleans, negative numbers and all other types without raising for them.',
    code: 'def valid_quantity(value):\n    return {{slot-1}} and {{slot-2}}',
    slots: [
      {
        label: 'Type gate',
        choices: ['type(value) is int', 'isinstance(value, int)', 'value is not None'],
      },
      { label: 'Range gate', choices: ['value >= 0', 'value > 0', 'value < 0'] },
    ],
    explanation:
      'An exact int type gate excludes bool before the comparison. A nonnegative bound retains zero; short-circuiting avoids comparing unrelated types.',
    misconception: 'possible-bool-as-int-or-zero-boundary',
    hint: 'Try True, zero, a negative integer and a string against both gates.',
    difficultyReason: 'Combine exact type acceptance with a safe boundary check',
  },
  {
    id: 'validation-label',
    competencyId: 'validation',
    difficulty: 3,
    subskill: 'input contracts',
    title: 'Normalize a label without hiding bad types',
    prompt:
      'Treat None as an absent label. Strip surrounding whitespace from strings. Raise TypeError for every other value, including zero and False.',
    code: 'def clean_label(value):\n    if value {{slot-1}}:\n        return ""\n    if {{slot-2}}:\n        raise TypeError("label must be text")\n    return value.strip()',
    slots: [
      { label: 'Absent-label condition', choices: ['is None', '== ""', 'is not None'] },
      {
        label: 'Invalid-type condition',
        choices: ['not isinstance(value, str)', 'not value', 'isinstance(value, str)'],
      },
    ],
    explanation:
      'The identity guard distinguishes None from other falsy values. The explicit string gate rejects invalid types while permitting empty and whitespace-only strings to normalize safely.',
    misconception: 'possible-falsy-value-overgeneralization',
    hint: 'Keep absence, empty text and an invalid falsy type as three distinct cases.',
    difficultyReason: 'Maintain separate absence, type and normalization contracts',
  },
  {
    id: 'testing-oracle',
    competencyId: 'testing',
    difficulty: 2,
    subskill: 'independent oracle',
    title: 'Give an empty-batch test an independent oracle',
    prompt:
      'The contract says the total of an empty batch is zero. Complete a value-equality test whose expectation does not call the implementation.',
    code: 'rows = []\nexpected = {{slot-1}}\nassert total(rows) {{slot-2}} expected',
    slots: [
      { label: 'Expected value', choices: ['0', 'total(rows)', 'None'] },
      { label: 'Assertion operator', choices: ['==', '!=', 'is'] },
    ],
    explanation:
      'The contract independently supplies zero. Value equality tests the required numeric value; recomputing total repeats any defect, while identity is not the promised property.',
    misconception: 'possible-circular-or-identity-oracle',
    hint: 'Derive the expected value before thinking about the implementation’s output.',
    difficultyReason: 'Separate an independent expected value from the property being asserted',
  },
  {
    id: 'testing-preserve',
    competencyId: 'testing',
    difficulty: 3,
    subskill: 'mutation verification',
    title: 'Verify both dashboard promises',
    prompt:
      'ranked_ids promises an ascending result and an unchanged input list. Fill two independent assertions that check those promises.',
    code: 'before = items.copy()\nresult = ranked_ids(items)\nassert {{slot-1}}\nassert result == {{slot-2}}',
    slots: [
      {
        label: 'Input preservation assertion',
        choices: ['items == before', 'items is before', 'result is not None'],
      },
      {
        label: 'Independent sorted expectation',
        choices: ['sorted(before)', 'ranked_ids(items)', 'items'],
      },
    ],
    explanation:
      'Comparing items with its pre-call copy detects mutation. sorted(before) provides an independent ascending expectation without repeating the function under test.',
    misconception: 'possible-output-only-or-circular-verification',
    hint: 'A passing output check alone does not establish that the input stayed unchanged.',
    difficultyReason: 'Verify two independent promises without a circular oracle',
  },
];
const blockQuestions: Question[] = drafts.map((d) => {
  const id = 'blocks3-' + d.id;
  const blockKey: Record<string, string> = {};
  const codeSlots = d.slots.map((s, i) => {
    const slotId = 'slot-' + (i + 1);
    const choices = s.choices.map((code) => ({
      id:
        'piece-' +
        createHash('sha256')
          .update(id + slotId + code)
          .digest('hex')
          .slice(0, 16),
      code,
    }));
    blockKey[slotId] = choices[0].id;
    const offset =
      parseInt(
        createHash('sha256')
          .update(id + slotId)
          .digest('hex')
          .slice(0, 2),
        16,
      ) % choices.length;
    return {
      id: slotId,
      label: s.label,
      choices: [...choices.slice(offset), ...choices.slice(0, offset)],
    };
  });
  return {
    id,
    version: d.id === 'errors-cleanup-v2' ? '3.0.1' : '3.0.0',
    competencyId: d.competencyId,
    difficulty: d.difficulty,
    type: 'completion',
    title: d.title,
    prompt: d.prompt,
    code: d.code,
    codeSlots,
    blockKey,
    subskill: d.subskill,
    explanation: d.explanation,
    misconception: d.misconception,
    hint: d.title + ': ' + d.hint,
    seconds: 150,
    context: 'Original SkillSetu workplace code-block repair',
    accessibility: { inputLabel: 'Choose a code block for each blank', codeLanguage: 'python' },
    difficultyReason: d.difficultyReason,
    exposureFamily: id,
  };
});
export const blockDiagnostic: Bank = {
  ...reviewedDiagnostic,
  id: 'python-adaptive-blocks-3.0.1',
  version: '3.0.1',
  questions: [...reviewedDiagnostic.questions, ...blockQuestions],
};
