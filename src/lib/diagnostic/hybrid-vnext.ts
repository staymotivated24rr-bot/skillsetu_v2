import { createHash } from 'node:crypto';
import type { Answer, Bank, Evidence, Finding, Question, Selection } from './types';

export const HYBRID_VERSION = 'hybrid-4.1.0-draft.1';
export type HybridContext = { seed: string; initialCompetency?: string };
export type Outcome = 'correct' | 'incorrect' | 'unsure';

// Versioned engineering topic bridges, not calibrated cognitive diagnoses. They only
// activate on an actual selected, authored distractor label. Missing tags create none.
export const TOPIC_BRIDGES = [
  {
    label: 'Possible difficulty distinguishing list references and copies',
    families: ['021', '022', '026'],
  },
  {
    label: 'Possible difficulty with function arguments and defaults',
    families: ['032', '040'],
  },
  {
    label: 'Possible difficulty tracing instance and shared class state',
    families: ['048', '049'],
  },
  { label: 'Possible difficulty comparing algorithmic complexity', families: ['065', '069'] },
  {
    label: 'Possible difficulty tracing exception cleanup and return order',
    families: ['081', '084', '086', '088'],
  },
  {
    label: 'Possible difficulty choosing boundary and adversarial tests',
    families: ['092', '098'],
  },
  { label: 'Possible difficulty with file modes or resource lifetime', families: ['113', '120'] },
].map((t) => ({ ...t, families: t.families.map((f) => 'SS-PY-FAM-' + f) }));

function answer(e: Evidence): Answer | null {
  try {
    const value = e.payload ? JSON.parse(e.payload) : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return {
      text: typeof value.text === 'string' ? value.text : undefined,
      selected: Number.isInteger(value.selected) ? value.selected : undefined,
    };
  } catch {
    return null;
  }
}
export function responseOutcome(e: Evidence): Outcome {
  return answer(e)?.text?.trim().toLowerCase() === 'unsure'
    ? 'unsure'
    : e.correct
      ? 'correct'
      : 'incorrect';
}
const family = (q: Question) => q.exposureFamily ?? q.id;
const normalizeTag = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
type Probe = {
  label: string;
  sourceLabels: Set<string>;
  support: Set<string>;
  counter: Set<string>;
  matches: (q: Question) => boolean;
};

/** Reconstruct from immutable responses, so refresh cannot lose an ability estimate. */
export function competencyEvidence(bank: Bank, evidence: Evidence[], competencyId: string) {
  const rows = evidence.filter(
    (e) => bank.questions.find((q) => q.id === e.questionId)?.competencyId === competencyId,
  );
  let difficulty = 2,
    correctStreak = 0,
    incorrectStreak = 0,
    adjustment = 'Start at intermediate.';
  const probes = new Map<string, Probe>();
  for (const e of rows) {
    const q = bank.questions.find((q) => q.id === e.questionId)!;
    const outcome = responseOutcome(e);
    if (e.assisted) {
      correctStreak = incorrectStreak = 0;
      adjustment = 'Assisted response: hold difficulty; no independent proficiency credit.';
    } else if (outcome === 'unsure') {
      correctStreak = incorrectStreak = 0;
      difficulty = Math.max(1, difficulty - 1);
      adjustment = 'Explicit uncertainty: offer a simpler independent task.';
    } else if (outcome === 'correct') {
      incorrectStreak = 0;
      correctStreak = q.difficulty >= difficulty ? correctStreak + 1 : 0;
      adjustment = 'One independent match: hold until repeated evidence.';
      if (correctStreak >= 2) {
        difficulty = Math.min(3, difficulty + 1);
        correctStreak = 0;
        adjustment =
          'Two consecutive independent matches at the requested level: consider one level higher.';
      }
    } else {
      correctStreak = 0;
      incorrectStreak = q.difficulty <= difficulty ? incorrectStreak + 1 : 0;
      adjustment = 'One independent miss: hold and investigate; no gap inferred from one answer.';
      if (incorrectStreak >= 2) {
        difficulty = Math.max(1, difficulty - 1);
        incorrectStreak = 0;
        adjustment =
          'Two consecutive independent misses at or below the requested level: consider one level lower.';
      }
    }
    if (e.assisted || outcome === 'unsure') continue;
    // Correct probes are counter-evidence only after a suspicion exists; earlier
    // successes are retained in the competency evidence but cannot refute a future error.
    if (outcome === 'correct') {
      for (const probe of probes.values())
        if (probe.matches(q) && !probe.support.has(family(q))) probe.counter.add(family(q));
      continue;
    }
    const selected = answer(e)?.selected;
    const label = selected === undefined ? null : q.optionHypotheses?.[selected];
    if (!label) continue;
    const bridge = TOPIC_BRIDGES.find((t) => t.families.includes(family(q)));
    const key = bridge?.label ?? normalizeTag(label);
    if (!probes.has(key))
      probes.set(key, {
        label: bridge?.label ?? label,
        sourceLabels: new Set(),
        support: new Set(),
        counter: new Set(),
        matches: (candidate) =>
          candidate.competencyId === competencyId &&
          (bridge
            ? bridge.families.includes(family(candidate))
            : !!candidate.optionHypotheses?.some(
                (h) => h && normalizeTag(h) === normalizeTag(label),
              )),
      });
    const probe = probes.get(key)!;
    probe.sourceLabels.add(label);
    probe.support.add(family(q));
  }
  const independent = rows.filter((e) => !e.assisted && responseOutcome(e) !== 'unsure');
  return {
    competencyId,
    rows,
    independent,
    difficulty,
    correctStreak,
    incorrectStreak,
    adjustment,
    probes: [...probes.values()],
  };
}

export function hybridNextFindings(bank: Bank, evidence: Evidence[]): Finding[] {
  return bank.competencies.map((c) => {
    const state = competencyEvidence(bank, evidence, c.id),
      independent = state.independent;
    const qFor = (e: Evidence) => bank.questions.find((q) => q.id === e.questionId)!;
    const correct = independent.filter((e) => e.correct).length;
    const incorrect = independent.length - correct;
    const unsure = state.rows.filter((e) => responseOutcome(e) === 'unsure').length;
    const assistedCount = state.rows.filter(
      (e) => e.assisted && responseOutcome(e) !== 'unsure',
    ).length;
    const familyCount = new Set(independent.map((e) => family(qFor(e)))).size;
    const subskills = new Set(independent.map((e) => qFor(e).subskill)).size;
    const demanding = independent.filter((e) => e.correct && qFor(e).difficulty >= 2).length;
    const lastTwo = independent.slice(-2);
    const sufficient =
      independent.length >= bank.policy.coverage && familyCount >= 3 && subskills >= 2;
    const hypotheses = state.probes.map((p) => ({
      label: p.label,
      observations: p.support.size,
      counterExamples: p.counter.size,
      confirmed: p.support.size >= 2 && p.counter.size === 0,
      state: (p.counter.size ? 'mixed' : p.support.size >= 2 ? 'repeated' : 'suspected') as
        'mixed' | 'repeated' | 'suspected',
      sourceLabels: [...p.sourceLabels],
    }));
    const strength =
      sufficient &&
      demanding >= 2 &&
      (correct === independent.length ||
        (independent.length >= 5 && incorrect === 1 && lastTwo.every((e) => e.correct)));
    const gap = sufficient && incorrect >= 2 && correct <= 1;
    const status = strength
      ? 'Demonstrated strength'
      : gap
        ? 'Likely gap'
        : 'Insufficient evidence';
    const needsFocus = state.rows.find((e) => !e.assisted && responseOutcome(e) !== 'correct');
    const nextSubskill = needsFocus ? qFor(needsFocus).subskill : c.subskills[0];
    const difficultyEvidence = ([1, 2, 3] as const)
      .map((level) => {
        const atLevel = state.rows.filter((e) => qFor(e).difficulty === level);
        return {
          level,
          correct: atLevel.filter((e) => !e.assisted && responseOutcome(e) === 'correct').length,
          incorrect: atLevel.filter((e) => !e.assisted && responseOutcome(e) === 'incorrect')
            .length,
          unsure: atLevel.filter((e) => responseOutcome(e) === 'unsure').length,
          assisted: atLevel.filter((e) => e.assisted && responseOutcome(e) !== 'unsure').length,
        };
      })
      .filter((level) => level.correct + level.incorrect + level.unsure + level.assisted > 0);
    return {
      competencyId: c.id,
      name: c.name,
      status,
      count: state.rows.length,
      independent: independent.length,
      correct,
      incorrect,
      unsure,
      assistedCount,
      familyCount,
      difficultyEvidence,
      types: new Set(independent.map((e) => `${qFor(e).sourceKind}/${qFor(e).type}`)).size,
      prerequisites: c.prerequisites,
      moduleSkillId: c.moduleSkillId,
      nextSubskill,
      hypotheses,
      nextStep:
        status === 'Demonstrated strength'
          ? `Confirm transfer with an unseen applied ${c.name.toLowerCase()} task; explain a boundary case without hints.`
          : `Practise ${nextSubskill}; trace one concrete case, compare an edge case, then verify on an unseen task without hints.`,
      reason: !sufficient
        ? `Limited independent evidence: ${independent.length} unassisted answers with a value or option, ${familyCount} families, ${subskills} subskills; ${unsure} unsure and ${assistedCount} assisted. Uncertainty is not a wrong-answer diagnosis.`
        : strength
          ? 'Repeated independent success, including applied tasks. This is a preliminary heuristic signal, not calibrated mastery.'
          : gap
            ? 'Repeated independent misses across different families. Confirm the suspected gap with a practical task; no single option establishes a persistent misconception.'
            : difficultyEvidence.some((l) => l.level === 2 && l.correct >= 2) &&
                difficultyEvidence.some((l) => l.level === 3 && l.incorrect > 0)
              ? 'Independent intermediate matches are present; advanced transfer is not established. See the difficulty-specific evidence and collect fresh practical evidence.'
              : 'Conflicting answers or limited applied success. Further independent evidence is needed; do not infer proficiency at the question limit.',
    };
  });
}

const rank = (seed: string, position: number, id: string) =>
  createHash('sha256').update(`${HYBRID_VERSION}\0${seed}\0${position}\0${id}`).digest('hex');
const compareTuple = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/** Rule-based selection boundary: future calibrated selectors can implement this same contract. */
export function hybridNextSelect(
  bank: Bank,
  evidence: Evidence[],
  context: HybridContext,
): Selection {
  const map = new Map(bank.questions.map((q) => [q.id, q]));
  if (
    !context.seed ||
    new Set(evidence.map((e) => e.questionId)).size !== evidence.length ||
    evidence.some((e) => !map.has(e.questionId))
  )
    throw new Error('Invalid adaptive context or evidence.');
  const used = new Set(evidence.map((e) => family(map.get(e.questionId)!)));
  if (used.size !== evidence.length) throw new Error('Repeated family in adaptive history.');
  const measured = hybridNextFindings(bank, evidence),
    p = bank.policy;
  if (evidence.length >= p.maximum)
    return {
      questionId: null,
      rationale: `Maximum ${p.maximum} responses reached; unresolved competencies remain Insufficient evidence.`,
    };
  const covered = measured.every((f) => f.count >= p.coverage);
  const available = bank.questions.filter((q) => !used.has(family(q)));
  if (!available.length)
    return {
      questionId: null,
      rationale:
        'Unused families exhausted. Stop honestly without repeating items or inferring mastery.',
    };
  const states = measured.map((f) => ({
    ...competencyEvidence(bank, evidence, f.competencyId),
    finding: f,
  }));
  const candidates = states.filter((s) => available.some((q) => q.competencyId === s.competencyId));
  const pending = (s: (typeof states)[number]) =>
    s.probes.filter(
      (probe) =>
        probe.support.size === 1 &&
        probe.counter.size === 0 &&
        available.some((q) => probe.matches(q) && Math.abs(q.difficulty - s.difficulty) <= 1),
    );
  if (
    evidence.length >= p.target &&
    covered &&
    measured.every((f) => f.status !== 'Insufficient evidence') &&
    !candidates.some((s) => pending(s).length)
  )
    return {
      questionId: null,
      rationale:
        'Target 24 and balanced eight-area coverage met with repeated independent evidence. No eligible single-observation probes remain. Preliminary conclusions only.',
    };
  if (
    evidence.length >= p.minimum &&
    covered &&
    candidates.every((s) => s.finding.status !== 'Insufficient evidence' && !pending(s).length)
  )
    return {
      questionId: null,
      rationale:
        'Unresolved competency families exhausted; report uncertainty rather than borrow evidence from resolved areas.',
    };
  const areaScore = (s: (typeof states)[number]) => [
    Number(s.finding.count >= p.coverage),
    s.finding.count < p.coverage
      ? s.finding.count
      : Number(s.finding.status !== 'Insufficient evidence'),
    evidence.length === 0 && context.initialCompetency
      ? Number(s.competencyId !== context.initialCompetency)
      : 0,
    -Number(pending(s).length > 0),
    s.finding.count < p.coverage ? 0 : s.finding.independent,
    s.finding.count,
  ];
  candidates.sort(
    (a, b) =>
      compareTuple(areaScore(a), areaScore(b)) ||
      rank(context.seed, evidence.length, a.competencyId).localeCompare(
        rank(context.seed, evidence.length, b.competencyId),
      ),
  );
  const state = candidates[0],
    probes = pending(state);
  const priorQs = state.rows.map((e) => map.get(e.questionId)!);
  const seenSubskills = new Set(priorQs.map((q) => q.subskill));
  const seenFormats = new Set(priorQs.map((q) => `${q.sourceKind}/${q.type}`));
  const itemScore = (q: Question) => [
    probes.length
      ? Number(
          !probes.some((probe) => probe.matches(q)) ||
            Math.abs(q.difficulty - state.difficulty) > 1,
        )
      : 0,
    Math.abs(q.difficulty - state.difficulty),
    Number(seenSubskills.has(q.subskill)),
    Number(seenFormats.has(`${q.sourceKind}/${q.type}`)),
  ];
  const items = available
    .filter((q) => q.competencyId === state.competencyId)
    .sort(
      (a, b) =>
        compareTuple(itemScore(a), itemScore(b)) ||
        rank(context.seed, evidence.length, a.id).localeCompare(
          rank(context.seed, evidence.length, b.id),
        ),
    );
  const selected = items[0],
    matches = probes.filter((probe) => probe.matches(selected));
  const unresolvedPrerequisites = bank.competencies
    .find((c) => c.id === state.competencyId)!
    .prerequisites.filter(
      (id) => measured.find((f) => f.competencyId === id)?.status !== 'Demonstrated strength',
    );
  return {
    questionId: selected.id,
    rationale: `${HYBRID_VERSION}; ${state.finding.count < p.coverage ? 'Mandatory balanced coverage' : 'Additional uncertainty investigation'}; ${state.finding.name}; requested difficulty ${state.difficulty}, selected ${selected.difficulty}. ${state.adjustment} ${matches.length ? 'Different-family misconception probe: ' + matches.map((p) => p.label).join('; ') + '.' : 'No eligible tagged probe; use ordinary difficulty-matched evidence.'} Unused family ${family(selected)}; ${state.rows.length} prior responses; prerequisite context ${unresolvedPrerequisites.join(', ') || 'none unresolved'}; lexicographic score ${JSON.stringify(itemScore(selected))}; seeded tie-break at position ${evidence.length}; seed is the immutable run ID.`,
  };
}
