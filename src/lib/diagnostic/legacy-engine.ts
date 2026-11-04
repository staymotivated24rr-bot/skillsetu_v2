import { z } from 'zod';
import { AppError } from '../errors';
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
    if (items.length < p.coverage || new Set(items.map((q) => q.type)).size < 2)
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
    if (q.type === 'decision') {
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
export function grade(question: Question, raw: Answer): { payload: Answer; correct: boolean } {
  const payload = answerSchema.parse(raw);
  const keys = Object.keys(payload);
  const required =
    question.type === 'decision' ? 'selected' : question.type === 'ordering' ? 'order' : 'text';
  if (keys.length !== 1 || keys[0] !== required)
    throw new AppError('Use the answer control for this question.');
  if (question.type === 'decision') {
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
    options: q.options,
    steps: q.steps,
    seconds: q.seconds,
    context: q.context,
    accessibility: q.accessibility,
  };
}
export function findings(bank: Bank, evidence: Evidence[]): Finding[] {
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
      reason:
        status === 'Demonstrated strength'
          ? 'Consistent unaided responses, including at least two applied tasks. This is a preliminary signal.'
          : status === 'Likely gap'
            ? 'Repeated difficulty across different task types. Confirm with a fresh practical task.'
            : 'Sparse, assisted, foundation-only or inconsistent evidence. Further assessment is needed.',
      prerequisites: c.prerequisites,
      moduleSkillId: c.moduleSkillId,
    };
  });
}
export function selectNext(bank: Bank, evidence: Evidence[]): Selection {
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
export function makeReport(bank: Bank, evidence: Evidence[], stopReason: string): Report {
  const measured = findings(bank, evidence),
    learningOrder: string[] = [],
    visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const f = measured.find((s) => s.competencyId === id)!;
    f.prerequisites.forEach(visit);
    if (f.status !== 'Demonstrated strength') learningOrder.push(id);
  }
  measured.forEach((s) => {
    if (s.status !== 'Demonstrated strength') visit(s.competencyId);
  });
  return {
    role: bank.roleName,
    bankId: bank.id,
    engineVersion: ENGINE_VERSION,
    answered: evidence.length,
    stopReason,
    findings: measured,
    learningOrder,
    evidence: evidence.map((e) => {
      const q = bank.questions.find((q) => q.id === e.questionId)!;
      return {
        questionId: e.questionId,
        correct: e.correct,
        assisted: e.assisted,
        title: q.title,
        explanation: q.explanation,
        misconception: e.correct ? null : q.misconception,
      };
    }),
  };
}
