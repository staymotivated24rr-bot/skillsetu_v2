// Original instructional content. Never import private lesson keys into client components.
import type { LessonContent, LessonStep } from './content';
const authored = (s: Omit<LessonStep, 'accessibility'>): LessonStep => ({
  ...s,
  accessibility: { label: s.title, description: s.objective },
});
const feedback = (correct: string, incorrect: string) => ({ correct, incorrect });
export const variablesLesson: LessonContent = {
  id: 'python-variables-references',
  version: '1.0.0-draft.1',
  schemaVersion: 1,
  roleId: 'python-developer',
  evaluatorVersion: 'studio-contracts-2',
  title: 'Python Variables, References, and Mutation',
  summary: 'Follow the names. Watch the objects. Make changes without surprises.',
  prerequisites: ['py-fundamentals'],
  prerequisiteLabels: ['Read a short sequence of Python statements'],
  objectives: [
    'Explain assignment and rebinding.',
    'Trace names and values across statements.',
    'Distinguish mutable and immutable objects.',
    'Recognize aliases and object identity.',
    'Predict list mutation and copying effects.',
    'Diagnose common reference-model mistakes.',
  ],
  masteryPolicy: {
    version: 'lesson-mastery-1',
    checkpoints: [
      'vr-rebind',
      'vr-alias-output',
      'vr-copy-output',
      'vr-string-output',
      'vr-identity',
    ],
    required: 4,
    finalStepId: 'vr-final',
  },
  steps: [
    authored({
      id: 'vr-names',
      kind: 'explanation',
      title: 'A name is a label, not a box',
      objective: 'Describe assignment as binding a name to an object.',
      instruction:
        'In Python, objects have values; names refer to objects. Assignment connects a name to an object. In score = 12, score refers to the integer object whose value is 12. Our A/B labels are diagram labels, not memory addresses. Never infer integer identity from these pictures.',
      referenceFrames: [
        {
          statement: 'score = 12',
          explanation:
            'The name score now refers to an integer. Integers are immutable: their value cannot be changed in place.',
          names: [{ name: 'score', objectId: 'A' }],
          objects: [{ id: 'A', value: '12', mutable: false }],
        },
      ],
      hint: 'Read the arrow as “refers to”.',
      key: { acknowledged: true },
      feedback: feedback(
        'You have the starting model: a name refers to an object.',
        'Review the reference model before continuing.',
      ),
    }),
    authored({
      id: 'vr-rebind',
      kind: 'prediction',
      title: 'Rebinding moves one label',
      independent: true,
      objective: 'Predict what a second name sees after the first is rebound.',
      instruction: 'Without running this code, enter the printed integer.',
      code: 'score = 12\nbackup = score\nscore = 19\nprint(backup)',
      key: { text: '12' },
      hint: 'The last assignment changes what score refers to. It does not assign anything to backup.',
      feedback: feedback(
        '12. backup still refers to the original value; score was rebound to 19.',
        'Walk through each assignment. backup keeps its binding when score is rebound; the old integer was not edited.',
      ),
    }),
    authored({
      id: 'vr-map',
      kind: 'explanation',
      title: 'Watch an alias, then a rebind',
      objective: 'Follow two names that first share an object and later separate.',
      instruction:
        'Step through this worked example. The object cards stay in place while the name bindings change. A rebind moves a name; it does not rewrite the old list.',
      referenceFrames: [
        {
          statement: 'basket = ["pear"]',
          explanation: 'One name refers to list A.',
          names: [{ name: 'basket', objectId: 'A' }],
          objects: [{ id: 'A', value: '["pear"]', mutable: true }],
        },
        {
          statement: 'saved = basket',
          explanation: 'No list was copied. Both names now refer to A: saved is an alias.',
          names: [
            { name: 'basket', objectId: 'A' },
            { name: 'saved', objectId: 'A' },
          ],
          objects: [{ id: 'A', value: '["pear"]', mutable: true }],
        },
        {
          statement: 'basket = ["plum"]',
          explanation: 'basket is rebound to a different list, B. saved still refers to A.',
          names: [
            { name: 'basket', objectId: 'B' },
            { name: 'saved', objectId: 'A' },
          ],
          objects: [
            { id: 'A', value: '["pear"]', mutable: true },
            { id: 'B', value: '["plum"]', mutable: true },
          ],
        },
      ],
      key: { acknowledged: true },
      hint: 'Follow each name’s arrow independently.',
      feedback: feedback(
        'You followed aliasing and rebinding as different operations.',
        'Inspect the final frame: the old list still has a name referring to it.',
      ),
    }),
    authored({
      id: 'vr-mutable',
      kind: 'reasoning',
      title: 'Which object can change in place?',
      objective: 'Distinguish mutable containers from immutable values.',
      instruction: 'Which statement accurately describes these Python objects?',
      options: [
        'A list can change its elements in place; a string cannot.',
        'Every assignment mutates the object on its right.',
        'An immutable tuple guarantees every object inside it is immutable.',
      ],
      key: { selected: 0 },
      hint: 'A tuple fixes its own references, but it may refer to a mutable list.',
      feedback: feedback(
        'Lists are mutable. Strings, integers and tuples are immutable, but a tuple can contain a mutable object.',
        'Separate an object from objects it refers to. Assignment rebinds names; it is not itself an instruction to mutate every object.',
      ),
    }),
    authored({
      id: 'vr-copy-block',
      kind: 'blocks',
      title: 'Give the working list its own container',
      objective: 'Choose an explicit shallow copy instead of an alias.',
      instruction:
        'For this flat list of immutable strings, choose a block so adding a new item to working does not change stock. The copy must remain a list.',
      code: 'stock = ["pen", "pad"]\nworking = {{copy}}\nworking.append("clip")',
      slots: [
        {
          id: 'copy',
          label: 'Independent outer list',
          choices: [
            { id: 'alias', code: 'stock' },
            { id: 'clone', code: 'stock.copy()' },
            { id: 'append-result', code: 'stock.append("clip")' },
          ],
        },
      ],
      key: { blocks: { copy: 'clone' } },
      hint: 'Assignment alone aliases the existing list. append mutates a list and returns None.',
      feedback: feedback(
        'stock.copy() creates a distinct outer list. A shallow copy is enough for these immutable string elements.',
        'You need a new outer list. Assigning stock keeps an alias; assigning the result of append would bind working to None.',
      ),
    }),
    authored({
      id: 'vr-alias-output',
      kind: 'prediction',
      title: 'A mutation travels through aliases',
      independent: true,
      objective: 'Predict a list mutation visible through another name.',
      instruction:
        'Enter the printed integer. Follow the shared list rather than copying values mentally.',
      code: 'points = [3]\nview = points\nview.append(8)\nprint(sum(points))',
      key: { text: '11' },
      hint: 'view and points refer to the same list; append changes that list.',
      feedback: feedback(
        '11. The one shared list now contains 3 and 8.',
        'No copy happened at view = points. The append changes the list that points also refers to.',
      ),
    }),
    authored({
      id: 'vr-copy-output',
      kind: 'prediction',
      title: 'A copy breaks the outer-list alias',
      independent: true,
      objective: 'Predict an edit to a distinct outer list.',
      responseFormat: 'literal',
      instruction: 'Enter the printed Python list. Spaces between values are optional.',
      code: 'seats = [2, 5]\ndraft = seats.copy()\ndraft[0] = 9\nprint(seats)',
      key: { text: '[2, 5]' },
      hint: 'draft is a different list. Replacing one of its integer elements does not edit seats.',
      feedback: feedback(
        '[2, 5]. Only draft changes to [9, 5]. The outer lists are distinct.',
        'Mark the copy as a second object before tracing the element replacement. seats still refers to the original list.',
      ),
    }),
    authored({
      id: 'vr-string-output',
      kind: 'prediction',
      title: 'An immutable value is replaced, not edited',
      independent: true,
      responseFormat: 'plain',
      objective: 'Explain string concatenation as rebinding in this example.',
      instruction:
        'Enter the printed text without quotes. For strings, += produces a string value and rebinds the name; it does not edit the original string.',
      code: 'label = "oak"\noriginal = label\nlabel += "!"\nprint(original)',
      key: { text: 'oak' },
      hint: 'Only label is assigned the concatenated string. original keeps the old binding.',
      feedback: feedback(
        'oak. original still refers to the original string. Lists behave differently: list += can mutate the existing list.',
        'Strings cannot be mutated in place. Do not assume += behaves identically for lists and strings.',
      ),
    }),
    authored({
      id: 'vr-trace',
      kind: 'trace',
      title: 'Separate a rebind from a later mutation',
      objective: 'Track two list bindings through multiple statements.',
      instruction:
        'Enter each final Python list. + creates a new list here, while append mutates the list it is called on.',
      code: 'first = [4]\nsecond = first\nfirst = first + [7]\nsecond.append(6)',
      cells: [
        { id: 'first', label: 'Final first', format: 'literal' },
        { id: 'second', label: 'Final second', format: 'literal' },
      ],
      key: { state: { first: '[4, 7]', second: '[4, 6]' } },
      hint: 'Draw the new list made by +. second remains attached to the earlier list.',
      feedback: feedback(
        'first is [4, 7]; second is [4, 6]. Rebinding first separates it before the later append.',
        'First draw the new outer list created by +. Then apply append to the old list through second.',
      ),
    }),
    authored({
      id: 'vr-identity',
      kind: 'reasoning',
      title: 'Equal values do not prove shared identity',
      independent: true,
      objective: 'Distinguish == from is without relying on caching details.',
      instruction:
        'Two separate list expressions are evaluated: left = [10] and right = [10]. Which statement is true?',
      code: 'left = [10]\nright = [10]',
      options: [
        'left is right, because their elements match.',
        'left == right is True, but left is right is False.',
        'Both comparisons are False.',
      ],
      key: { selected: 1 },
      hint: 'For these lists, == compares values and is compares whether the object itself is shared.',
      feedback: feedback(
        'The lists have equal contents and distinct identities. Use is for identity, not as a replacement for value equality.',
        'There are two separately created list objects. Matching contents alone do not make them the same object.',
      ),
    }),
    authored({
      id: 'vr-review',
      kind: 'explanation',
      title: 'Your reference-model checklist',
      objective: 'Diagnose common aliasing mistakes before the independent check.',
      instruction:
        'Assignment binds a name. Rebinding moves only that name. Mutation changes an object and is visible through its aliases. A shallow copy creates a new outer container, not recursive independence: nested mutable objects can still be shared. == and is ask different questions. Review your earlier answers using Previous or the lesson map; then attempt the final check without hints.',
      visual: {
        label: 'Three questions to ask while tracing',
        cards: [
          { label: 'Assignment', value: 'Which object does this name refer to?' },
          { label: 'Mutation', value: 'Which aliases can see this change?' },
          { label: 'Copy', value: 'Which level was actually copied?' },
        ],
      },
      key: { acknowledged: true },
      hint: 'Explain an operation as a rebind or an object change before predicting the next line.',
      feedback: feedback(
        'The final check uses a different case. It has no hints and records your first response separately from learning retries.',
        'Review the checklist before attempting the final check.',
      ),
    }),
    authored({
      id: 'vr-final',
      kind: 'mastery',
      title: 'Independent check: follow both names',
      independent: true,
      objective: 'Apply assignment, rebinding, aliasing and identity to a fresh case.',
      instruction:
        'Without hints or running the code, enter the final list for each name and the printed identity result (True or False). Submit all three answers together. Your first attempt determines this final check; retries teach but do not rewrite it.',
      code: 'a = [5]\nb = a\na = [9]\nb.append(2)\nprint(a)\nprint(b)\nprint(a is b)',
      cells: [
        { id: 'a', label: 'Final check: a', format: 'literal' },
        { id: 'b', label: 'Final check: b', format: 'literal' },
        { id: 'same', label: 'Final check: a is b', format: 'literal' },
      ],
      key: { state: { a: '[9]', b: '[5, 2]', same: 'False' } },
      masteryVariants: [
        {
          code: 'a = [5]\nb = a\na = [9]\nb.append(2)\nprint(a)\nprint(b)\nprint(a is b)',
          key: { state: { a: '[9]', b: '[5, 2]', same: 'False' } },
        },
        {
          code: 'a = [7]\nb = a\nb.append(3)\nb = [1]\nprint(a)\nprint(b)\nprint(a is b)',
          key: { state: { a: '[7, 3]', b: '[1]', same: 'False' } },
        },
        {
          code: 'a = [8]\nb = a\na.append(4)\nprint(a)\nprint(b)\nprint(a is b)',
          key: { state: { a: '[8, 4]', b: '[8, 4]', same: 'True' } },
        },
      ],
      hint: 'No hints are available during the independent final check.',
      feedback: feedback(
        'All three predictions match. Follow the recorded first-attempt result in your lesson review.',
        'At least one prediction differs. Rebinding changes one name; append changes the object reached through its receiver. Revisit the worked reference map, then retry for learning or start a new run for a different check.',
      ),
    }),
  ],
};
