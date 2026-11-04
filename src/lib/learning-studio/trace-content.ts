// Private, original authored models. No Python is evaluated or executed here.
import type { TraceFrame, TraceKind, TracePrediction } from './trace-types';
type Frame = TraceFrame & {
  prediction?: TracePrediction & { correct: number; explanation: string };
};
export type AuthoredPythonTrace = {
  id: string;
  version: string;
  kind: TraceKind;
  title: string;
  introduction: string;
  code: string[];
  frames: Frame[];
};
const frame = (
  id: string,
  line: number,
  explanation: string,
  rest: Partial<Frame> = {},
): Frame => ({
  id,
  line,
  explanation,
  variables: [],
  references: [],
  objects: [],
  output: [],
  stack: [],
  ...rest,
});
const v = (name: string, value: string, scope = 'module') => ({ name, value, scope });
const check = (prompt: string, options: string[], correct: number, explanation: string) => ({
  prompt,
  options,
  correct,
  explanation,
});
const version = '1.0.0-draft.1';
export const pythonTraces: AuthoredPythonTrace[] = [
  {
    id: 'trace-rebinding',
    version,
    kind: 'variables',
    title: 'Follow a rebinding',
    introduction:
      'Track values after each statement. Rebinding one name does not reassign another name.',
    code: ['score = 8', 'saved = score', 'score = score + 5', 'print(saved, score)'],
    frames: [
      frame(
        'start',
        0,
        'No statements have been modeled yet. Predict, then reveal the first assignment.',
      ),
      frame('assign', 1, 'score now refers to the integer value 8.', {
        variables: [v('score', '8')],
        prediction: check(
          'What value does score have after line 1?',
          ['8', '5', '13'],
          0,
          'The assignment binds score to 8.',
        ),
      }),
      frame(
        'save',
        2,
        'saved now refers to the same value, 8. Neither name has changed the value.',
        { variables: [v('score', '8'), v('saved', '8')] },
      ),
      frame(
        'rebind',
        3,
        'score is rebound to 13. saved still refers to 8; integers are immutable.',
        {
          variables: [v('score', '13'), v('saved', '8')],
          prediction: check(
            'After line 3, which pair is saved, score?',
            ['13, 13', '8, 13', '8, 8'],
            1,
            'Rebinding score does not rebind saved.',
          ),
        },
      ),
      frame(
        'print',
        4,
        'print reads saved first and score second. The space separates the two printed values.',
        { variables: [v('score', '13'), v('saved', '8')], output: ['8 13'] },
      ),
    ],
  },
  {
    id: 'trace-list-alias',
    version,
    kind: 'references',
    title: 'One list, two names',
    introduction:
      'Follow symbolic object labels through aliasing, mutation and copying. These labels are not memory addresses.',
    code: [
      'queue = [2]',
      'alias = queue',
      'alias.append(7)',
      'queue = queue.copy()',
      'queue.append(9)',
      'print(alias, queue)',
    ],
    frames: [
      frame('start', 0, 'No list or names exist in this authored model yet.'),
      frame('create', 1, 'queue refers to list A.', {
        variables: [v('queue', '[2]')],
        references: [{ name: 'queue', objectId: 'A' }],
        objects: [{ id: 'A', value: '[2]', mutable: true }],
      }),
      frame('alias', 2, 'alias and queue both refer to A; assignment did not copy the list.', {
        variables: [v('queue', '[2]'), v('alias', '[2]')],
        references: [
          { name: 'queue', objectId: 'A' },
          { name: 'alias', objectId: 'A' },
        ],
        objects: [{ id: 'A', value: '[2]', mutable: true }],
        prediction: check(
          'Does alias = queue create another list?',
          ['Yes, a separate list', 'No, both names refer to A'],
          1,
          'Assignment copies the reference, not the list.',
        ),
      }),
      frame('mutate', 3, 'append changes A itself. Both names observe [2, 7].', {
        variables: [v('queue', '[2, 7]'), v('alias', '[2, 7]')],
        references: [
          { name: 'queue', objectId: 'A' },
          { name: 'alias', objectId: 'A' },
        ],
        objects: [{ id: 'A', value: '[2, 7]', mutable: true }],
        prediction: check(
          'What does queue refer to after alias.append(7)?',
          ['[2]', '[2, 7]', '[7]'],
          1,
          'Both names observe the same mutated list.',
        ),
      }),
      frame(
        'copy',
        4,
        'copy makes new outer list B. queue is rebound to B; alias stays with A. Nested objects would still need separate reasoning.',
        {
          variables: [v('queue', '[2, 7]'), v('alias', '[2, 7]')],
          references: [
            { name: 'queue', objectId: 'B' },
            { name: 'alias', objectId: 'A' },
          ],
          objects: [
            { id: 'A', value: '[2, 7]', mutable: true },
            { id: 'B', value: '[2, 7]', mutable: true },
          ],
        },
      ),
      frame('separate', 5, 'Only B changes when queue.append(9) runs. A remains [2, 7].', {
        variables: [v('queue', '[2, 7, 9]'), v('alias', '[2, 7]')],
        references: [
          { name: 'queue', objectId: 'B' },
          { name: 'alias', objectId: 'A' },
        ],
        objects: [
          { id: 'A', value: '[2, 7]', mutable: true },
          { id: 'B', value: '[2, 7, 9]', mutable: true },
        ],
        prediction: check(
          'After appending 9 to queue, what does alias show?',
          ['[2, 7, 9]', '[2, 7]', '[9]'],
          1,
          'alias still refers to A; only B was edited.',
        ),
      }),
      frame(
        'print',
        6,
        'The two list values now differ because the last append acted on the copy.',
        {
          variables: [v('queue', '[2, 7, 9]'), v('alias', '[2, 7]')],
          references: [
            { name: 'queue', objectId: 'B' },
            { name: 'alias', objectId: 'A' },
          ],
          objects: [
            { id: 'A', value: '[2, 7]', mutable: true },
            { id: 'B', value: '[2, 7, 9]', mutable: true },
          ],
          output: ['[2, 7] [2, 7, 9]'],
        },
      ),
    ],
  },
  {
    id: 'trace-loop-total',
    version,
    kind: 'loop',
    title: 'Watch a loop accumulate',
    introduction:
      'An exclusive range stop and a running total become visible one iteration at a time.',
    code: ['total = 0', 'for reading in range(1, 4):', '    total += reading', 'print(total)'],
    frames: [
      frame('start', 0, 'The trace begins before total is assigned.'),
      frame('initialize', 1, 'Initialize total once, before the loop.', {
        variables: [v('total', '0')],
      }),
      frame('first-bind', 2, 'Iteration 1 binds reading to 1.', {
        variables: [v('total', '0'), v('reading', '1')],
        iteration: { number: 1, phase: 'body', value: '1' },
      }),
      frame('first-add', 3, 'Add 1 to the prior total, 0.', {
        variables: [v('total', '1'), v('reading', '1')],
        iteration: { number: 1, phase: 'body', value: '1' },
        prediction: check(
          'What is total after the first addition?',
          ['0', '1', '3'],
          1,
          'The first addition is 0 + 1.',
        ),
      }),
      frame('second-bind', 2, 'Iteration 2 changes reading to 2; total is not reset.', {
        variables: [v('total', '1'), v('reading', '2')],
        iteration: { number: 2, phase: 'body', value: '2' },
      }),
      frame('second-add', 3, 'Add 2 to 1, producing 3.', {
        variables: [v('total', '3'), v('reading', '2')],
        iteration: { number: 2, phase: 'body', value: '2' },
      }),
      frame('third-bind', 2, 'Iteration 3 binds reading to 3, the last visited value.', {
        variables: [v('total', '3'), v('reading', '3')],
        iteration: { number: 3, phase: 'body', value: '3' },
        prediction: check(
          'What is the final value visited by range(1, 4)?',
          ['4', '3', '2'],
          1,
          'The stop value 4 is excluded.',
        ),
      }),
      frame('third-add', 3, 'Add 3 to 3. The accumulated total is now 6.', {
        variables: [v('total', '6'), v('reading', '3')],
        iteration: { number: 3, phase: 'body', value: '3' },
      }),
      frame(
        'finished',
        2,
        'The range is exhausted. There is no fourth body iteration. reading retains its last value in this module scope.',
        {
          variables: [v('total', '6'), v('reading', '3')],
          iteration: { number: 3, phase: 'finished' },
        },
      ),
      frame('print', 4, 'After the loop ends, print reads the final total, 6.', {
        variables: [v('total', '6'), v('reading', '3')],
        iteration: { number: 3, phase: 'finished' },
        output: ['6'],
      }),
    ],
  },
  {
    id: 'trace-function-return',
    version,
    kind: 'function',
    title: 'Enter a call, carry a return',
    introduction:
      'Separate a function definition, its local call frame and the value returned to its caller.',
    code: [
      'def double(n):',
      '    answer = n * 2',
      '    return answer',
      '',
      'result = double(3)',
      'print(result)',
    ],
    frames: [
      frame('start', 0, 'The function has not been defined or called in the model yet.'),
      frame('define', 1, 'Defining double creates a function; its body has not run.', {
        variables: [v('double', '<function double>')],
        stack: [{ name: 'module', locals: [] }],
      }),
      frame(
        'call',
        5,
        'Evaluate the right side before assigning result. The call binds local parameter n to 3.',
        {
          variables: [v('double', '<function double>'), v('n', '3', 'double')],
          stack: [
            { name: 'module', locals: [] },
            { name: 'double', locals: [{ name: 'n', value: '3' }] },
          ],
          prediction: check(
            'Does the module already have result when the function call begins?',
            ['Yes, result is 3', 'No, assignment awaits the returned value'],
            1,
            'The right side must finish before result is bound.',
          ),
        },
      ),
      frame(
        'body',
        2,
        'The local calculation binds answer to 6. It is local to this call, not a module variable.',
        {
          variables: [
            v('double', '<function double>'),
            v('n', '3', 'double'),
            v('answer', '6', 'double'),
          ],
          stack: [
            { name: 'module', locals: [] },
            {
              name: 'double',
              locals: [
                { name: 'n', value: '3' },
                { name: 'answer', value: '6' },
              ],
            },
          ],
        },
      ),
      frame(
        'return',
        3,
        'return sends 6 to the caller. The next model step removes this call frame.',
        {
          variables: [
            v('double', '<function double>'),
            v('n', '3', 'double'),
            v('answer', '6', 'double'),
          ],
          stack: [
            { name: 'module', locals: [] },
            {
              name: 'double',
              locals: [
                { name: 'n', value: '3' },
                { name: 'answer', value: '6' },
              ],
              returning: '6',
            },
          ],
          prediction: check(
            'Which value is returned to the caller?',
            ['3', 'None', '6'],
            2,
            'return reads the local answer, which is 6.',
          ),
        },
      ),
      frame(
        'assign-return',
        5,
        'The call finishes and result becomes 6. Local n and answer no longer appear as active call state.',
        {
          variables: [v('double', '<function double>'), v('result', '6')],
          stack: [{ name: 'module', locals: [{ name: 'result', value: '6' }] }],
        },
      ),
      frame('print', 6, 'print reads the returned value stored in result.', {
        variables: [v('double', '<function double>'), v('result', '6')],
        stack: [{ name: 'module', locals: [{ name: 'result', value: '6' }] }],
        output: ['6'],
      }),
    ],
  },
];
