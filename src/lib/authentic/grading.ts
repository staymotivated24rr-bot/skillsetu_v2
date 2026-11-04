import type { AuthenticTask, TaskPayload, PublicTask, EvidenceSummary, TaskType } from './types';
import type { Score, Skill } from '../types';
export function publicTask(task: AuthenticTask): PublicTask {
  return {
    id: task.id,
    type: task.type,
    skillIds: task.skillIds,
    scenario: task.scenario,
    title: task.title,
    context: task.context,
    prompt: task.prompt,
    minutes: task.minutes,
    options: task.options,
    steps: task.steps,
    starter: task.starter,
    functionName: task.functionName,
    transfer: task.transfer,
    independent: task.independent,
    inputs: task.cases?.map((c) => c.args),
    rubricDimensions: task.rubric?.map((r) => r.label),
  };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value) ?? 'null';
}
export function gradeTask(task: AuthenticTask, payload: TaskPayload) {
  let score = 0;
  if (task.cases) {
    if (!payload.code || !payload.outputs || payload.outputs.length !== task.cases.length)
      throw new Error('Run this code against all evaluation cases first.');
    score =
      task.cases.filter((c, i) => canonical(c.expected) === canonical(payload.outputs![i])).length /
      task.cases.length;
  } else if (task.type === 'decision') {
    if (payload.selected === undefined || !task.options?.[payload.selected])
      throw new Error('Choose a valid decision.');
    score = Number(payload.selected === task.correct);
  } else if (task.type === 'ordered-steps') {
    const order = payload.order;
    if (
      !order ||
      order.length !== task.order?.length ||
      new Set(order).size !== order.length ||
      order.some((id) => !task.steps?.some((s) => s.id === id))
    )
      throw new Error('Order every step exactly once.');
    // Pairwise ordering provides partial credit without assuming all mistakes are equal.
    let matched = 0,
      total = 0;
    for (let i = 0; i < task.order.length; i++)
      for (let j = i + 1; j < task.order.length; j++) {
        total++;
        if (order.indexOf(task.order[i]) < order.indexOf(task.order[j])) matched++;
      }
    score = total ? matched / total : 0;
  } else {
    const text =
      payload.text
        ?.normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim() ?? '';
    if (text.length < 30) score = 0;
    else {
      const rubric = task.rubric ?? [];
      const weight = rubric.reduce((n, r) => n + r.weight, 0);
      score = weight
        ? rubric.reduce(
            (n, r) =>
              n +
              (r.concepts.some((c) => {
                const term = c
                  .toLowerCase()
                  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                  .trim();
                // Match complete concepts, not fragments such as "untested" containing "test".
                return (' ' + text + ' ').includes(' ' + term + ' ');
              })
                ? r.weight
                : 0),
            0,
          ) / weight
        : 0;
    }
  }
  const response =
    score >= 0.75 ? task.branch.strong : score >= 0.4 ? task.branch.developing : task.branch.risk;
  return {
    score,
    correct: score >= 0.75,
    response,
    passed: task.cases ? Math.round(score * task.cases.length) : undefined,
    total: task.cases?.length,
  };
}
export function strength(
  count: number,
  summary: Pick<EvidenceSummary, 'types' | 'scenarios' | 'transfer' | 'independent'>,
): EvidenceSummary {
  const label =
    count >= 5 &&
    summary.types.length >= 3 &&
    summary.scenarios.length >= 3 &&
    summary.independent >= 3 &&
    summary.transfer > 0
      ? 'Stronger evidence'
      : count >= 3 && summary.types.length >= 2 && summary.scenarios.length >= 2
        ? 'Moderate evidence'
        : 'Limited evidence';
  return {
    ...summary,
    strength: label,
    reason:
      label === 'Limited evidence'
        ? 'Treat this as a tentative signal; collect independent evidence in another context.'
        : `${count} opportunities across ${summary.scenarios.length} contexts and ${summary.types.length} task types. ${summary.transfer} transfer opportunities. These labels are descriptive, not statistical confidence intervals.`,
  };
}
export function scoreEvidence(
  tasks: AuthenticTask[],
  answers: { taskId: string; score: number }[],
  skills: Skill[],
): Score[] {
  const byId = new Map(answers.map((a) => [a.taskId, a.score]));
  if (
    byId.size !== answers.length ||
    answers.length !== tasks.length ||
    tasks.some((t) => !byId.has(t.id))
  )
    throw new Error('A complete, unique set of task evidence is required.');
  return skills.map((skill) => {
    const mapped = tasks.filter((t) => t.skillIds.some((m) => m.skillId === skill.id));
    const weight = mapped.reduce(
      (n, t) => n + t.skillIds.find((m) => m.skillId === skill.id)!.weight,
      0,
    );
    const summary = strength(mapped.length, {
      types: [...new Set(mapped.map((t) => t.type))] as TaskType[],
      scenarios: [...new Set(mapped.map((t) => t.scenario))],
      transfer: mapped.filter((t) => t.transfer).length,
      independent: mapped.filter((t) => t.independent).length,
    });
    return {
      skillId: skill.id,
      score: weight
        ? Math.round(
            (100 *
              mapped.reduce(
                (n, t) =>
                  n +
                  (byId.get(t.id) ?? 0) * t.skillIds.find((m) => m.skillId === skill.id)!.weight,
                0,
              )) /
              weight,
          )
        : 0,
      evidence: mapped.length,
      quality: summary,
    };
  });
}
