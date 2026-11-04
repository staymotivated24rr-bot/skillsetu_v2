// Public catalog metadata only. Authored contracts and solutions stay on the server.
export const lessonNavigation: Record<string, { title: string; summary: string; count: number }> = {
  'studio-positive-batch': {
    title: 'Trace a safe batch total',
    summary: 'Guided browser Python practice.',
    count: 8,
  },
  'python-variables-references': {
    title: 'Python Variables, References, and Mutation',
    summary: 'Follow the names. Watch the objects. Make changes without surprises.',
    count: 12,
  },
  'python-loop-boundaries': {
    title: 'Loops: every item, exactly once',
    summary: 'Explore a loop, predict its boundary, then repair a practical task.',
    count: 8,
  },
  'python-values-division': {
    title: 'Values, names, and division',
    summary: 'Follow a value, choose an operation, and verify its numeric contract.',
    count: 8,
  },
  'python-transfer-manifest': {
    title: 'Transfer challenge: build a dispatch manifest',
    summary: 'Apply several skills to a new practical contract before seeing a worked solution.',
    count: 4,
  },
};
export function lessonHref(lessonId: string, source?: string, competency?: string) {
  const base =
    lessonId === 'python-variables-references'
      ? '/diagnostic-v2/learn/variables'
      : `/diagnostic-v2/learn/lesson?lesson=${encodeURIComponent(lessonId)}`;
  return (
    base +
    (source && competency
      ? `${base.includes('?') ? '&' : '?'}source=${encodeURIComponent(source)}&competency=${encodeURIComponent(competency)}`
      : '')
  );
}
export function instructionalLesson(skill: string, subskill = '') {
  const loops = ['loop boundaries', 'For loops and range', 'While loops', 'List comprehensions'];
  if (['py-fundamentals', 'starter-fundamentals'].includes(skill)) {
    if (loops.includes(subskill)) return 'python-loop-boundaries';
    if (
      [
        '',
        'Variables and true division',
        'assignment',
        'integer division',
        'values and division',
      ].includes(subskill)
    )
      return 'python-values-division';
  }
  if (
    ['py-structures', 'starter-collections8'].includes(skill) &&
    ['', 'aliasing', 'Aliasing and mutation', 'List append', 'Shallow copies'].includes(subskill)
  )
    return 'python-variables-references';
  return undefined;
}
