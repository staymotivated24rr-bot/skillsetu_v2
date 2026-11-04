import type { Question } from '../types';
/** New candidate revisions, never edits to the supplied JSON or earlier run snapshots.
 * Engineering corrections are still unapproved; independent educator review is mandatory.
 */
export const clarifications: Record<string, Partial<Question>> = {
  'SS-PY-0222': {
    prompt:
      'Which algorithm finds a minimum spanning tree of a connected, weighted, undirected graph?',
  },
  'SS-PY-0305': {
    prompt:
      'A measurement contract requires math.isclose with relative tolerance 1e-6 and absolute tolerance 1e-9. Which comparison implements that contract?',
  },
  'SS-PY-0343': {
    prompt:
      'Which expression returns True exactly when the case-sensitive key API_KEY is present in os.environ, including when its value is an empty string, and returns False without raising when it is absent?',
    options: [
      'bool(os.getenv("API_KEY"))',
      'os.getenv("api_key") is not None',
      '"API-KEY" in os.environ',
      '"API_KEY" in os.environ',
    ],
    correct: 3,
    explanation:
      'Membership tests the exact key and includes empty-string values. Truthiness confuses empty with absent, and differently spelled keys test different entries.',
    optionHypotheses: [
      'Possible confusion between empty and absent environment values.',
      'Possible confusion about exact environment key spelling.',
      'Possible confusion about exact environment key spelling.',
      null,
    ],
  },
  'SS-PY-0344': {
    prompt:
      'Which expression yields .csv-matching paths directly inside data that refer to files, excluding directory paths and recursive descendants?',
    options: [
      'Path("data").glob("data.csv")',
      'Path("data").glob("*.txt")',
      '(p for p in Path("data").glob("*.csv") if p.is_file())',
      'Path("data").iterdir()',
    ],
    correct: 2,
    explanation:
      'The nonrecursive glob filters names, and is_file excludes directory paths. An exact filename omits other CSVs; iterdir alone includes unrelated names and directories.',
    optionHypotheses: [
      'Possible confusion between a single filename and a wildcard match.',
      'Possible mismatch between required and selected file suffix.',
      null,
      'Possible confusion between directory enumeration and filtering files by name and type.',
    ],
  },
  'SS-PY-0346': {
    prompt:
      'Assume program is a fixed trusted executable that treats user_arg as a data argument. Which invocation avoids interpreting user_arg as shell syntax? This question does not establish protection from the executable’s own argument semantics.',
  },
};
