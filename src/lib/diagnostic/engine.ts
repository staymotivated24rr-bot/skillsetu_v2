import * as legacy from './legacy-engine';
import { matchesContract } from './contracts';
import { z } from 'zod';
import { AppError } from '../errors';
import { numericResult } from './numeric';
import { optionPresentationIssues } from './option-presentation';
import { hybridFindings, hybridSelect } from './hybrid';
import {
  HYBRID_VERSION,
  hybridNextFindings,
  hybridNextSelect,
  responseOutcome,
} from './hybrid-vnext';
import type {
  Answer,
  Bank,
  Evidence,
  Finding,
  PublicQuestion,
  Question,
  Report,
  Selection,
} from './types';
export const ENGINE_VERSION = 'rules-1.0.0';
export const answerSchema = z
  .object({
    text: z.string().trim().min(1).max(1000).optional(),
    selected: z.number().int().min(0).max(20).optional(),
    order: z.array(z.string().max(40)).max(10).optional(),
    blocks: z
      .record(z.string().min(1).max(40), z.string().min(1).max(40))
      .refine((v) => Object.keys(v).length <= 4)
      .optional(),
  })
  .strict();
/** Validate an authored bank before publication; invalid content never starts a run. */
export function validateBank(bank: Bank): void {
  const p = bank.policy,
    ids = new Set(bank.competencies.map((c) => c.id));
  if (
    !bank.id ||
    !bank.version ||
    !bank.roleId ||
    !ids.size ||
    ids.size !== bank.competencies.length ||
    ![p.minimum, p.target, p.maximum, p.coverage].every(Number.isInteger) ||
    p.coverage < 3 ||
    p.minimum < ids.size * p.coverage ||
    p.target < p.minimum ||
    p.maximum < p.target ||
    p.maximum > bank.questions.length ||
    new Set(bank.questions.map((q) => q.id)).size !== bank.questions.length
  )
    throw new Error('Invalid diagnostic bank policy or identifiers.');
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (!ids.has(id) || visiting.has(id))
      throw new Error('Invalid or cyclic competency prerequisites.');
    if (visited.has(id)) return;
    visiting.add(id);
    bank.competencies.find((c) => c.id === id)!.prerequisites.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  for (const c of bank.competencies) {
    visit(c.id);
    const items = bank.questions.filter((q) => q.competencyId === c.id);
    if (
      items.length < p.coverage ||
      (bank.version.startsWith('4.')
        ? new Set(items.map((q) => q.subskill)).size < 2
        : new Set(items.map((q) => q.type)).size < 2)
    )
      throw new Error('Insufficient competency content coverage.');
  }
  for (const q of bank.questions) {
    if (
      !ids.has(q.competencyId) ||
      ![1, 2, 3].includes(q.difficulty) ||
      !q.version ||
      !q.explanation ||
      !q.accessibility.inputLabel
    )
      throw new Error('Invalid question metadata.');
    if (q.codeSlots) {
      const slots = q.codeSlots;
      const placeholders = [...(q.code ?? '').matchAll(/\{\{([A-Za-z0-9-]+)\}\}/g)].map(
        (m) => m[1],
      );
      if (
        q.type !== 'completion' ||
        slots.length < 1 ||
        slots.length > 4 ||
        new Set(slots.map((s) => s.id)).size !== slots.length ||
        placeholders.length !== slots.length ||
        slots.some((s) => placeholders.filter((id) => id === s.id).length !== 1) ||
        !q.blockKey ||
        Object.keys(q.blockKey).length !== slots.length ||
        slots.some(
          (s) =>
            !s.id ||
            s.id.length > 40 ||
            !s.label ||
            s.choices.length < 2 ||
            s.choices.length > 6 ||
            new Set(s.choices.map((c) => c.id)).size !== s.choices.length ||
            s.choices.some(
              (c) => !c.id || c.id.length > 40 || !c.code.trim() || c.code.length > 240,
            ) ||
            !s.choices.some((c) => c.id === q.blockKey![s.id]),
        )
      )
        throw new Error('Invalid code-block contract.');
    } else if (q.type === 'decision') {
      if (q.options && optionPresentationIssues(q.options).length)
        throw new Error(`Quarantined ambiguous option presentation: ${q.id}`);
      if (!Number.isInteger(q.correct) || !q.options?.[q.correct!])
        throw new Error('Invalid decision key.');
    } else if (q.type === 'ordering') {
      if (
        !q.order ||
        q.order.length < 2 ||
        new Set(q.order).size !== q.order.length ||
        q.steps?.length !== q.order.length ||
        new Set(q.steps.map((s) => s.id)).size !== q.order.length ||
        q.order.some((id) => !q.steps?.some((s) => s.id === id))
      )
        throw new Error('Invalid workflow key.');
    } else if (!q.expected?.length || q.expected.some((v) => !v.trim()))
      throw new Error('Missing accepted answers.');
  }
}
export function grade(
  question: Question,
  raw: Answer,
  options?: { allowUnsure: boolean },
): { payload: Answer; correct: boolean } {
  if (options?.allowUnsure) {
    const payload = answerSchema.parse(raw);
    if (Object.keys(payload).length === 1 && payload.text?.toLowerCase() === 'unsure')
      return { payload, correct: false };
  }
  if (question.numeric || question.optionHypotheses) {
    const payload = answerSchema.parse(raw);
    if (Object.keys(payload).length === 1 && payload.text?.toLowerCase() === 'unsure')
      return { payload, correct: false };
    if (question.numeric) {
      if (Object.keys(payload).length !== 1 || !payload.text)
        throw new AppError('Use the numeric answer field.');
      const result = numericResult(question.numeric, payload.text);
      if (!result.format)
        throw new AppError(
          result.message + ' This format error does not count as a response.',
          422,
        );
      return { payload, correct: result.correct };
    }
  }
  if (question.codeSlots) {
    const payload = answerSchema.parse(raw);
    if (Object.keys(payload).length === 1 && payload.text?.toLowerCase() === 'unsure')
      return { payload, correct: false };
    if (Object.keys(payload).length !== 1 || !payload.blocks)
      throw new AppError('Choose a code block for every blank, or select unsure.');
    const selected = payload.blocks;
    if (
      Object.keys(selected).length !== question.codeSlots.length ||
      question.codeSlots.some((s) => !s.choices.some((c) => c.id === selected[s.id]))
    )
      throw new AppError('Choose an available code block for every blank.');
    return {
      payload,
      correct: question.codeSlots.every((s) => selected[s.id] === question.blockKey?.[s.id]),
    };
  }
  if (question.contract) {
    const payload = answerSchema.parse(raw);
    if (Object.keys(payload).length !== 1 || !payload.text)
      throw new AppError('Use the text answer control.');
    return {
      payload,
      correct:
        payload.text.toLowerCase() !== 'unsure' &&
        matchesContract(payload.text, question.contract.examples),
    };
  }
  const payload = answerSchema.parse(raw);
  const keys = Object.keys(payload);
  const required =
    question.type === 'decision' ? 'selected' : question.type === 'ordering' ? 'order' : 'text';
  if (keys.length !== 1 || keys[0] !== required)
    throw new AppError('Use the answer control for this question.');
  if (question.type === 'decision') {
    if (question.options && optionPresentationIssues(question.options).length)
      throw new AppError(
        'This question has ambiguous options and cannot be scored. No response was counted; please report this item.',
        422,
      );
    if (!question.options?.[payload.selected!]) throw new AppError('Choose an available answer.');
    return { payload, correct: payload.selected === question.correct };
  }
  if (question.type === 'ordering') {
    const order = payload.order!;
    if (
      order.length !== question.order?.length ||
      new Set(order).size !== order.length ||
      order.some((id) => !question.steps?.some((s) => s.id === id))
    )
      throw new AppError('Order every step exactly once.');
    return { payload, correct: order.every((id, i) => id === question.order![i]) };
  }
  // Exact authored fragments and predicted values only; never eval or execute learner text.
  return { payload, correct: question.expected?.includes(payload.text!.trim()) ?? false };
}
export function publicQuestion(q: Question): PublicQuestion {
  return {
    id: q.id,
    version: q.version,
    competencyId: q.competencyId,
    difficulty: q.difficulty,
    type: q.type,
    title: q.title,
    prompt: q.prompt,
    code: q.code,
    codeSlots: q.codeSlots?.map((s) => ({
      id: s.id,
      label: s.label,
      choices: s.choices.map((c) => ({ id: c.id, code: c.code })),
    })),
    options: q.options,
    steps: q.steps,
    seconds: q.seconds,
    context: q.context,
    accessibility: q.accessibility,
    subskill: q.subskill,
    interaction: q.interaction,
    difficultyReason: q.difficultyReason,
    numeric: q.numeric
      ? { kind: q.numeric.kind, places: q.numeric.places, hint: q.numeric.hint }
      : undefined,
  };
}
export function findings(bank: Bank, evidence: Evidence[]): Finding[] {
  if (bank.version.startsWith('4.')) return hybridFindings(bank, evidence);
  if (bank.version.startsWith('1.')) return legacy.findings(bank, evidence);
  return bank.competencies.map((c) => {
    const responses = evidence.filter(
      (e) => bank.questions.find((q) => q.id === e.questionId)?.competencyId === c.id,
    );
    const independent = responses.filter((r) => !r.assisted);
    const correct = independent.filter((r) => r.correct).length;
    const types = new Set(
      independent.map((r) => bank.questions.find((q) => q.id === r.questionId)!.type),
    ).size;
    const demanding = independent.filter(
      (r) => r.correct && bank.questions.find((q) => q.id === r.questionId)!.difficulty >= 2,
    ).length;
    // No single answer produces a conclusion; disagreement or hints keep uncertainty visible.
    const sufficient = independent.length >= bank.policy.coverage && types >= 2;
    const status =
      sufficient && correct === independent.length && demanding >= 2
        ? 'Demonstrated strength'
        : sufficient && correct <= 1
          ? 'Likely gap'
          : 'Insufficient evidence';
    return {
      competencyId: c.id,
      name: c.name,
      status,
      count: responses.length,
      independent: independent.length,
      correct,
      types,
      nextSubskill: responses.find((r) => !r.correct && !r.assisted)
        ? bank.questions.find(
            (q) => q.id === responses.find((r) => !r.correct && !r.assisted)!.questionId,
          )?.subskill
        : c.subskills[0],
      nextStep:
        'Work through the targeted example, predict a neighbouring case, then verify on an unseen task.',
      reason:
        status === 'Demonstrated strength'
          ? 'Consistent unaided responses, including at least two applied tasks. This is a preliminary signal.'
          : status === 'Likely gap'
            ? 'Repeated difficulty across different task types. Confirm with a fresh practical task.'
            : independent.length < bank.policy.coverage
              ? 'Too few independent responses; assisted responses do not count toward conclusions.'
              : types < 2
                ? 'Independent evidence covers too few task formats.'
                : demanding < 2 && correct === independent.length
                  ? 'Only foundation-level success; applied transfer is still unverified.'
                  : 'Conflicting independent observations; a fresh parallel task is needed.',
      prerequisites: c.prerequisites,
      moduleSkillId: c.moduleSkillId,
    };
  });
}
export function selectNext(
  bank: Bank,
  evidence: Evidence[],
  context?: { version: string; seed: string; initialCompetency?: string },
): Selection {
  if (context?.version === HYBRID_VERSION) return hybridNextSelect(bank, evidence, context);
  if (bank.version.startsWith('4.')) return hybridSelect(bank, evidence);
  if (bank.version.startsWith('1.')) return legacy.selectNext(bank, evidence);
  if (
    new Set(evidence.map((e) => e.questionId)).size !== evidence.length ||
    evidence.some((e) => !bank.questions.some((q) => q.id === e.questionId))
  )
    throw new Error('Invalid evidence history.');
  const n = evidence.length,
    p = bank.policy,
    states = findings(bank, evidence);
  if (n >= p.maximum)
    return {
      questionId: null,
      rationale: 'Maximum length reached; unresolved areas remain insufficient evidence.',
    };
  const covered = states.every((s) => s.count >= p.coverage);
  if (n >= p.minimum && covered && states.every((s) => s.status !== 'Insufficient evidence'))
    return {
      questionId: null,
      rationale:
        'Minimum length and coverage met; repeated evidence is consistent across every competency.',
    };
  if (
    n >= p.target &&
    covered &&
    states.every((s) => s.status !== 'Insufficient evidence' || s.independent >= 5)
  )
    return {
      questionId: null,
      rationale:
        'Target length met with repeated investigation; unresolved inconsistencies are reported honestly.',
    };
  const available = bank.questions.filter((q) => !evidence.some((e) => e.questionId === q.id));
  const exhausted = states.filter(
    (s) =>
      s.status === 'Insufficient evidence' &&
      !available.some((q) => q.competencyId === s.competencyId),
  );
  if (n >= p.minimum && covered && exhausted.length)
    return {
      questionId: null,
      rationale: `Unresolved competency bank exhausted: ${exhausted.map((s) => s.name).join(', ')}. Stop without inferring mastery; collect a fresh reviewed form.`,
    };
  if (!available.length)
    return {
      questionId: null,
      rationale: 'Bank exhausted; report unresolved evidence without a mastery claim.',
    };
  const deficit = states.reduce((sum, s) => sum + Math.max(0, p.coverage - s.count), 0);
  const last = evidence.at(-1),
    previous = bank.questions.find((q) => q.id === last?.questionId);
  let competency: string | undefined,
    rationale = '';
  if (p.maximum - n <= deficit) {
    competency = states.find((s) => s.count < p.coverage)?.competencyId;
    rationale = 'Reserve remaining questions for mandatory competency coverage.';
  } else if (previous && last && !last.correct) {
    competency = bank.competencies
      .find((c) => c.id === previous.competencyId)!
      .prerequisites.find(
        (id) =>
          states.find((s) => s.competencyId === id)!.count < p.coverage &&
          available.some((q) => q.competencyId === id),
      );
    if (competency)
      rationale = `Investigate prerequisite ${competency} after difficulty with ${previous.competencyId}; the cause is not yet established.`;
  }
  if (!competency && previous) {
    const state = states.find((s) => s.competencyId === previous.competencyId)!;
    if (state.count < p.coverage) {
      competency = state.competencyId;
      rationale = last!.correct
        ? 'Verify deeper understanding with another task before drawing a conclusion.'
        : 'Verify the suspected gap with a different, easier task.';
    }
  }
  if (!competency || !available.some((q) => q.competencyId === competency)) {
    const ranked = [...states]
      .filter((s) => available.some((q) => q.competencyId === s.competencyId))
      .sort(
        (a, b) =>
          Number(b.count < p.coverage) - Number(a.count < p.coverage) ||
          Number(a.status !== 'Insufficient evidence') -
            Number(b.status !== 'Insufficient evidence') ||
          a.count - b.count,
      );
    competency = ranked[0].competencyId;
    rationale =
      ranked[0].count < p.coverage
        ? 'Collect required competency coverage.'
        : 'Resolve inconsistent or limited evidence with a fresh task.';
  }
  const prior = evidence.filter(
    (e) => bank.questions.find((q) => q.id === e.questionId)!.competencyId === competency,
  );
  const recent = prior.at(-1),
    recentQuestion = bank.questions.find((q) => q.id === recent?.questionId);
  const difficulty = recent
    ? Math.max(
        1,
        Math.min(3, recentQuestion!.difficulty + (recent.correct && !recent.assisted ? 1 : -1)),
      )
    : 2;
  const seenTypes = new Set(
    prior.map((e) => bank.questions.find((q) => q.id === e.questionId)!.type),
  );
  const candidates = available
    .filter((q) => q.competencyId === competency)
    .sort(
      (a, b) =>
        Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty) ||
        Number(seenTypes.has(a.type)) - Number(seenTypes.has(b.type)) ||
        a.id.localeCompare(b.id),
    );
  return {
    questionId: candidates[0].id,
    rationale: `${rationale} Requested difficulty ${difficulty}; ${prior.length} prior responses in ${competency}.`,
  };
}
export function makeReport(
  bank: Bank,
  evidence: (Evidence & { payload?: string })[],
  stopReason: string,
  engineVersion?: string,
): Report {
  if (bank.version.startsWith('1.')) return legacy.makeReport(bank, evidence, stopReason);
  const measured =
      engineVersion === HYBRID_VERSION
        ? hybridNextFindings(bank, evidence)
        : findings(bank, evidence),
    learningOrder: string[] = [],
    visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const f = measured.find((s) => s.competencyId === id)!;
    f.prerequisites.forEach(visit);
    if (f.status !== 'Demonstrated strength') learningOrder.push(id);
  }
  const prioritized =
    engineVersion === HYBRID_VERSION
      ? [...measured].sort(
          (a, b) =>
            Number(b.status === 'Likely gap') - Number(a.status === 'Likely gap') ||
            Number(!!b.hypotheses?.some((h) => h.confirmed)) -
              Number(!!a.hypotheses?.some((h) => h.confirmed)) ||
            (b.unsure ?? 0) - (a.unsure ?? 0),
        )
      : measured;
  prioritized.forEach((s) => {
    if (s.status !== 'Demonstrated strength') visit(s.competencyId);
  });
  return {
    role: bank.roleName,
    bankId: bank.id,
    engineVersion:
      engineVersion ??
      (bank.version.startsWith('4.')
        ? 'hybrid-4.0.0-draft.1'
        : bank.version.startsWith('3.')
          ? 'rules-3.0.0'
          : 'rules-2.0.0'),
    answered: evidence.length,
    stopReason,
    findings: measured,
    learningOrder,
    evidence: evidence.map((e) => {
      const q = bank.questions.find((q) => q.id === e.questionId)!;
      let submittedCode: string | undefined;
      if (q.codeSlots && e.payload) {
        const answer = answerSchema.parse(JSON.parse(e.payload));
        submittedCode =
          answer.text?.toLowerCase() === 'unsure'
            ? 'No code submitted (unsure response).'
            : q.code?.replace(
                /\{\{([A-Za-z0-9-]+)\}\}/g,
                (_, id: string) =>
                  q
                    .codeSlots!.find((s) => s.id === id)
                    ?.choices.find((c) => c.id === answer.blocks?.[id])?.code ?? '[unfilled]',
              );
      }
      return {
        questionId: e.questionId,
        ...(submittedCode ? { submittedCode } : {}),
        correct: e.correct,
        assisted: e.assisted,
        ...(engineVersion === HYBRID_VERSION ? { outcome: responseOutcome(e) } : {}),
        title: q.title,
        explanation: q.explanation,
        misconception:
          e.correct ||
          e.assisted ||
          (e.payload && JSON.parse(e.payload).text?.toLowerCase() === 'unsure')
            ? null
            : q.optionHypotheses && e.payload
              ? (q.optionHypotheses[JSON.parse(e.payload).selected] ?? null)
              : engineVersion === HYBRID_VERSION
                ? null
                : q.misconception,
      };
    }),
  };
}
