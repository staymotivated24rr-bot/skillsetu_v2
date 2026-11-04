import type { Answer, Bank, Evidence, Finding, Selection } from './types';

export function misconceptionSignals(bank: Bank, evidence: Evidence[], competencyId: string) {
  const groups = new Map<string, Set<string>>();
  for (const e of evidence) {
    const q = bank.questions.find((q) => q.id === e.questionId);
    if (!q || q.competencyId !== competencyId || e.correct || e.assisted || !e.payload) continue;
    let answer: Answer;
    try {
      answer = JSON.parse(e.payload);
    } catch {
      continue;
    }
    if (answer.selected === undefined) continue; // Unsure is not a misconception.
    const label = q.optionHypotheses?.[answer.selected];
    if (!label) continue;
    if (!groups.has(label)) groups.set(label, new Set());
    groups.get(label)!.add(q.exposureFamily ?? q.id);
  }
  return [...groups].map(([label, families]) => ({
    label,
    observations: families.size,
    confirmed: families.size >= 2,
  }));
}

export function hybridFindings(bank: Bank, evidence: Evidence[]): Finding[] {
  return bank.competencies.map((c) => {
    const items = evidence.filter(
      (e) => bank.questions.find((q) => q.id === e.questionId)?.competencyId === c.id,
    );
    const independent = items.filter((e) => !e.assisted);
    const question = (e: Evidence) => bank.questions.find((q) => q.id === e.questionId)!;
    const families = new Set(independent.map((e) => question(e).exposureFamily));
    const subskills = new Set(independent.map((e) => question(e).subskill));
    const types = new Set(independent.map((e) => `${question(e).sourceKind}/${question(e).type}`))
      .size;
    const correct = independent.filter((e) => e.correct).length;
    const demanding = independent.filter((e) => e.correct && question(e).difficulty >= 2).length;
    const sufficient =
      independent.length >= bank.policy.coverage && families.size >= 3 && subskills.size >= 2;
    const status =
      sufficient && correct === independent.length && demanding >= 2
        ? 'Demonstrated strength'
        : sufficient && correct <= 1
          ? 'Likely gap'
          : 'Insufficient evidence';
    const next = independent.find((e) => !e.correct);
    const nextSubskill = next ? question(next).subskill : c.subskills[0];
    return {
      competencyId: c.id,
      name: c.name,
      status,
      count: items.length,
      independent: independent.length,
      correct,
      types,
      prerequisites: c.prerequisites,
      moduleSkillId: c.moduleSkillId,
      nextSubskill,
      nextStep: `Study ${nextSubskill}; explain a boundary case, then verify on an unseen task without hints.`,
      hypotheses: misconceptionSignals(bank, evidence, c.id),
      reason: !sufficient
        ? `Limited independent variety: ${independent.length} responses, ${families.size} families, ${subskills.size} subskills. Assistance does not establish proficiency.`
        : status === 'Demonstrated strength'
          ? 'Consistent independent matches across different families, including applied difficulty. Preliminary draft-bank signal only.'
          : status === 'Likely gap'
            ? 'Repeated independent difficulty across families. Confirm with a practical task; this does not establish a persistent misconception.'
            : 'Conflicting responses or too little applied success. More independent evidence is needed.',
    };
  });
}

export function hybridSelect(bank: Bank, evidence: Evidence[]): Selection {
  if (
    new Set(evidence.map((e) => e.questionId)).size !== evidence.length ||
    evidence.some((e) => !bank.questions.some((q) => q.id === e.questionId))
  )
    throw new Error('Invalid evidence history.');
  const states = hybridFindings(bank, evidence),
    p = bank.policy;
  if (evidence.length >= p.maximum)
    return {
      questionId: null,
      rationale: 'Maximum 30 responses reached; unresolved evidence remains uncertain.',
    };
  if (
    evidence.length >= p.minimum &&
    states.every((s) => s.count >= p.coverage && s.status !== 'Insufficient evidence')
  )
    return {
      questionId: null,
      rationale:
        'Eight-area coverage and repeated independent evidence met. Preliminary draft conclusions only.',
    };
  const used = new Set(
    evidence.map((e) => bank.questions.find((q) => q.id === e.questionId)!.exposureFamily),
  );
  const available = bank.questions.filter((q) => !used.has(q.exposureFamily));
  if (!available.length)
    return {
      questionId: null,
      rationale: 'Unused question families exhausted. Stop without inferring mastery.',
    };
  const ranked = states
    .filter((s) => available.some((q) => q.competencyId === s.competencyId))
    .sort(
      (a, b) =>
        Number(b.count < p.coverage) - Number(a.count < p.coverage) ||
        (a.count < p.coverage || b.count < p.coverage
          ? a.count - b.count
          : Number(a.status !== 'Insufficient evidence') -
            Number(b.status !== 'Insufficient evidence')) ||
        a.count - b.count,
    );
  const state = ranked[0];
  const prior = evidence.filter(
    (e) => bank.questions.find((q) => q.id === e.questionId)!.competencyId === state.competencyId,
  );
  const recent = prior.slice(-2);
  const lastQ = bank.questions.find((q) => q.id === prior.at(-1)?.questionId);
  // A single miss/hint cannot lower difficulty; two independent matches/misses can.
  const repeated =
    recent.length === 2 &&
    recent.every((e) => !e.assisted) &&
    recent.every((e) => e.correct === recent[0].correct);
  const difficulty = Math.max(
    1,
    Math.min(3, (lastQ?.difficulty ?? 2) + (repeated ? (recent[0].correct ? 1 : -1) : 0)),
  );
  const seenSubskills = new Set(
    prior.map((e) => bank.questions.find((q) => q.id === e.questionId)!.subskill),
  );
  const signals = misconceptionSignals(bank, evidence, state.competencyId);
  const prerequisite = bank.competencies
    .find((c) => c.id === state.competencyId)!
    .prerequisites.filter(
      (id) => states.find((s) => s.competencyId === id)!.status !== 'Demonstrated strength',
    );
  const candidates = available
    .filter((q) => q.competencyId === state.competencyId)
    .sort(
      (a, b) =>
        Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty) ||
        Number(seenSubskills.has(a.subskill)) - Number(seenSubskills.has(b.subskill)) ||
        Number(
          !a.optionHypotheses?.some((h) => signals.some((s) => s.label === h && !s.confirmed)),
        ) -
          Number(
            !b.optionHypotheses?.some((h) => signals.some((s) => s.label === h && !s.confirmed)),
          ) ||
        a.id.localeCompare(b.id),
    );
  return {
    questionId: candidates[0].id,
    rationale: `${state.count < p.coverage ? 'Balanced mandatory eight-area coverage' : 'Investigate unresolved independent evidence'}; ${state.name}; requested difficulty ${difficulty} (${repeated ? 'two consistent independent observations' : 'hold until repeated evidence'}); ${prior.length} prior responses; unused family ${candidates[0].exposureFamily}; ${signals.length} unconfirmed/repeated option hypotheses; prerequisite context: ${prerequisite.join(', ') || 'none unresolved'}.`,
  };
}
