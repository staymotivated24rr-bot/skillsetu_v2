import type { Gap, Item, Score, Skill } from './types';
export function scoreAssessment(
  items: Pick<Item, 'id' | 'correct' | 'skills'>[],
  answers: { questionId: string; selected: number }[],
  skillMap: Skill[],
): Score[] {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.selected]));
  if (
    answerMap.size !== answers.length ||
    items.length !== answers.length ||
    items.some((q) => !answerMap.has(q.id))
  )
    throw new Error('A complete, unique set of assessment answers is required.');
  return skillMap.map((s) => {
    const evidence = items.flatMap((q) =>
      q.skills
        .filter((m) => m.skillId === s.id)
        .map((m) => ({ weight: m.weight, correct: answerMap.get(q.id) === q.correct })),
    );
    const weight = evidence.reduce((n, m) => n + m.weight, 0);
    return {
      skillId: s.id,
      score: weight
        ? Math.round((100 * evidence.reduce((n, m) => n + (m.correct ? m.weight : 0), 0)) / weight)
        : 0,
      evidence: evidence.length,
    };
  });
}
export function readiness(scores: Score[], skills: Skill[]): number {
  const byId = new Map(scores.map((s) => [s.skillId, s.score]));
  const weights = skills.reduce((n, s) => n + s.importance, 0);
  return weights
    ? Math.round(skills.reduce((n, s) => n + (byId.get(s.id) ?? 0) * s.importance, 0) / weights)
    : 0;
}
export function meetsRequirements(
  scores: Score[],
  requirements: { skillId: string; target: number }[],
): boolean {
  const byId = new Map(scores.filter((s) => s.evidence > 0).map((s) => [s.skillId, s.score]));
  return (
    requirements.length > 0 &&
    requirements.every((r) => byId.has(r.skillId) && byId.get(r.skillId)! >= r.target)
  );
}
export function readinessLabel(scores: Score[], skills: Skill[]): string {
  if (
    meetsRequirements(
      scores,
      skills.map((s) => ({ skillId: s.id, target: s.target })),
    )
  )
    return 'Meets prototype readiness threshold';
  const r = readiness(scores, skills);
  return r >= 75 ? 'Near role-ready' : r >= 45 ? 'Developing' : 'Needs significant development';
}
export function planGaps(scores: Score[], skills: Skill[]): Gap[] {
  const byId = new Map(scores.map((s) => [s.skillId, s.score]));
  const gaps = skills
    .filter((s) => (byId.get(s.id) ?? 0) < s.target)
    .map((s) => ({
      ...s,
      current: byId.get(s.id) ?? 0,
      gap: s.target - (byId.get(s.id) ?? 0),
      priority: (s.target - (byId.get(s.id) ?? 0)) * s.importance,
      blockedBy: s.prerequisites.filter(
        (id) => (byId.get(id) ?? 0) < (skills.find((x) => x.id === id)?.target ?? 0),
      ),
      reason: '',
    }));
  gaps.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const result: Gap[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function add(g: Gap) {
    if (visited.has(g.id)) return;
    if (visiting.has(g.id)) throw new Error('Skill prerequisites contain a cycle.');
    visiting.add(g.id);
    for (const id of g.blockedBy) {
      const prerequisite = gaps.find((x) => x.id === id);
      if (prerequisite) add(prerequisite);
    }
    visiting.delete(g.id);
    visited.add(g.id);
    g.reason = g.blockedBy.length
      ? 'Build the prerequisites first, then repair this gap.'
      : `A ${g.gap}-point gap in a ${g.importance}/5 importance skill.`;
    result.push(g);
  }
  gaps.forEach(add);
  return result;
}
export function compareScores(before: Score[], after: Score[], skills: Skill[]) {
  return skills.map((s) => {
    const b = before.find((x) => x.skillId === s.id)?.score ?? 0;
    const a = after.find((x) => x.skillId === s.id)?.score ?? 0;
    return { ...s, before: b, after: a, change: a - b };
  });
}
export function mastery(
  items: { id: string }[],
  answers: { itemId: string; correct: boolean; first: boolean }[],
) {
  const first = items.map((q) => answers.find((a) => a.itemId === q.id && a.first));
  const complete = first.every(Boolean);
  const correct = first.filter((a) => a?.correct).length;
  return {
    complete,
    correct,
    total: items.length,
    mastered: complete && correct / items.length >= 0.75 && first.at(-1)?.correct === true,
  };
}
export const disclaimer =
  'SkillSetu readiness is an estimated prototype indicator based on demonstrated assessment performance and is not a guarantee of employment.';
