// Original practice starters; no diagnostic keys or cross-role credit.
export type RepairScenario = {
  prompt: string;
  options: string[];
  explain: string;
  transfer?: string;
};
export const binarySearchLesson = {
  title: 'Why binary search takes O(log n)',
  concept:
    'Linear search may inspect all n values: O(n). Binary search on a sorted, random-access list compares the middle value and discards half the remaining search space: O(log n). Sorting first has its own cost; this comparison assumes the list is already sorted and uses index bounds, not copied slices.',
  example:
    'For 128 sorted values, the remaining candidate counts can shrink 128 → 64 → 32 → 16 → 8 → 4 → 2 → 1 → 0. Each comparison halves the range; at most 8 comparisons are needed. A linear scan can need 128. Doubling to 256 adds at most one binary-search comparison, while a worst-case linear scan doubles. An empty list needs no comparisons; a single value needs at most one.',
  scenario: {
    prompt:
      'A sorted list grows from 1,024 to 2,048 values. How does the worst-case work change for index-based binary search compared with linear search?',
    options: [
      'Binary search adds at most one comparison; linear search can require twice as many.',
      'Both algorithms require twice as many comparisons.',
    ],
    explain:
      'Binary search halves its search space, so one more halving handles a doubling of n: O(log n). Linear search can visit every value, so doubling n doubles its worst-case O(n) work.',
    transfer:
      'Trace a missing target in 32 sorted values using low/high index bounds. List the shrinking ranges, then predict how many extra comparisons 64 values can require. Also check an empty list and a target at either end.',
  } satisfies RepairScenario,
};

export function starterLessonFor(skill: string, subskill = '') {
  if (
    skill === 'starter-dsa' &&
    /^(Algorithmic complexity|Time complexity|Binary search)$/i.test(subskill.trim())
  )
    return binarySearchLesson;
  return starterLessons[skill];
}

export const starterLessons: Record<
  string,
  { title: string; concept: string; example: string; scenario?: RepairScenario }
> = {
  'starter-fundamentals': {
    title: 'Trace values and boundaries',
    concept:
      'Track type and value separately after each operation. An exclusive stop is never visited.',
    example:
      'For readings [0, 3, 5], sketch a table with index, reading and running total. Compare an empty input and one reading.',
  },
  'starter-collections8': {
    title: 'Track identity and mutation',
    concept:
      'Draw container references before applying an edit. A new outer container can still share nested values.',
    example:
      'Create two references to the same nested list on paper. Trace a nested edit, then contrast rebinding one reference.',
  },
  'starter-functions8': {
    title: 'Make function contracts explicit',
    concept:
      'Separate arguments, returned values and persistent state. For recursion, identify a base case and decreasing input.',
    example:
      'Write the contract for a helper that returns a fresh collection. Predict two calls and one empty input before inspecting its implementation.',
  },
  'starter-objects': {
    title: 'Separate instance and class state',
    concept:
      'Distinguish attributes stored on each instance from shared class attributes. Resolve method lookup explicitly.',
    example:
      'Sketch two instances with a shared class setting and independent instance counters. Predict a change to each storage location.',
  },
  'starter-dsa': {
    title: 'Choose an algorithm from its contract',
    concept:
      'State input assumptions before comparing complexity. Graph weighting and the required output determine which algorithms apply.',
    example:
      'Compare a queue-based traversal for unweighted reachability with a priority queue for nonnegative path costs. Explain what changes when negative edges appear.',
  },
  'starter-debugging': {
    title: 'Trace failure and cleanup',
    concept:
      'Find the operation that raises, the narrow handler that catches it, and cleanup that must still occur.',
    example:
      'Write a timeline for a parse failure inside try/except/finally. Add a different exception type and predict which statements run.',
  },
  'starter-testing8': {
    title: 'Derive independent test expectations',
    concept:
      'Choose an observable contract and cases that could distinguish a correct implementation from a plausible defect.',
    example:
      'For an inclusive permitted interval, test values immediately below, at and above both bounds. Explain which defect each case would catch.',
  },
  'starter-practical': {
    title: 'Design safe data and I/O boundaries',
    concept:
      'Separate parsing, validation and side effects. State encoding, resource lifetime and trust assumptions.',
    example:
      'Plan a CSV import as read, parse, validate, then persist. Predict empty-file and malformed-row behavior without exposing payloads in logs.',
  },
};
