/** Public display metadata only: never import authored banks into a client bundle. */
export const countLabel = (count: number, singular: string, plural = singular + 's') =>
  `${count} ${count === 1 ? singular : plural}`;

/** Presentation only: historical rationale/report strings remain byte-for-byte stored. */
export function diagnosticSentence(text: string) {
  const forms: Record<string, string> = {
    responses: 'response',
    answers: 'answer',
    families: 'family',
    subskills: 'subskill',
    'prior responses': 'prior response',
    'unassisted answers': 'unassisted answer',
  };
  return text.replace(
    /\b1 (prior responses|unassisted answers|responses|answers|families|subskills)\b/g,
    (_, plural: string) => `1 ${forms[plural]}`,
  );
}

export const diagnosticPresentations = {
  legacy: {
    minimum: 18,
    maximum: 30,
    competencies: [
      'Values & control flow',
      'Collections & mutation',
      'Function contracts',
      'Failure handling',
      'Input validation',
      'Testing & verification',
    ],
  },
  starter: {
    minimum: 24,
    maximum: 30,
    competencies: [
      'Python Fundamentals',
      'Collections & Mutation',
      'Functions & Recursion',
      'Object-Oriented Python',
      'DSA Using Python',
      'Debugging & Exceptions',
      'Testing & Validation',
      'Practical Python Coding',
    ],
  },
};
export const areaCountLabel = (count: number) =>
  count === 8 ? 'eight' : count === 6 ? 'six' : String(count);
