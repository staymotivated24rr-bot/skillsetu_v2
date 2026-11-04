// Independent learning policy. Never imported by the diagnostic adaptive/scoring engine.
import type { Bank, Finding, Report } from '../diagnostic/types';
import { pythonTopics } from '../tracks/python-topics';
import { buildPathway, PATHWAY_VERSION, VARIABLES_MODULE, type PathwayItem } from './pathway';
import type { LearningRecommendation, PracticeHistory, PracticeSummary } from './selector-types';
import { instructionalLesson, lessonHref, lessonNavigation } from './lesson-navigation';

export const LEARNING_SELECTOR_VERSION = 'learning-revision-2-draft.1';
export const SCHEDULING_TIMEZONE = 'Asia/Kolkata';
// Instructional difficulty, not psychometric calibration. Published lesson content stays intact.
const rule = {
  moduleVersionId: VARIABLES_MODULE,
  lessonId: 'python-variables-references',
  checkpoints: [
    'vr-rebind',
    'vr-alias-output',
    'vr-copy-output',
    'vr-string-output',
    'vr-identity',
  ],
  easy: ['vr-rebind'],
  final: 'vr-final',
  forms: 3,
  required: 4,
};
const practiceContracts: Record<string, typeof rule> = {
  [VARIABLES_MODULE]: rule,
  'python-loop-boundaries@1.0.0-draft.1': {
    ...rule,
    lessonId: 'python-loop-boundaries',
    moduleVersionId: 'python-loop-boundaries@1.0.0-draft.1',
    checkpoints: ['loop-predict', 'loop-empty', 'loop-repair'],
    easy: ['loop-empty'],
    final: 'loop-verify',
    required: 2,
  },
  'python-values-division@1.0.0-draft.1': {
    ...rule,
    lessonId: 'python-values-division',
    moduleVersionId: 'python-values-division@1.0.0-draft.1',
    checkpoints: ['division-rebind', 'division-float', 'division-floor'],
    easy: ['division-rebind'],
    final: 'division-verify',
    required: 2,
  },
  'python-transfer-manifest@1.0.0-draft.1': {
    ...rule,
    lessonId: 'python-transfer-manifest',
    moduleVersionId: 'python-transfer-manifest@1.0.0-draft.1',
    checkpoints: ['manifest-repair'],
    easy: [],
    final: 'manifest-verify',
    required: 1,
  },
};
function calendarDay(value: string) {
  if (!Number.isFinite(Date.parse(value))) throw new Error('Invalid learning evidence date.');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: SCHEDULING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
}
function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function summarizePractice(
  histories: PracticeHistory[],
  moduleVersionId?: string,
): PracticeSummary {
  const empty: PracticeSummary = {
    status: 'not-started',
    completedSteps: 0,
    totalSteps: 0,
    firstUnaidedMatches: 0,
    firstUnaidedMisses: 0,
    firstAssisted: 0,
    hintUses: 0,
    repeatedMatches: 0,
    repeatedEasyMatches: 0,
    assistedFinals: 0,
    freshFinalPasses: 0,
    freshFinalMisses: 0,
    availableFreshForms: 0,
    nextOrdinal: 1,
    finalAttempted: false,
    moduleVersionId,
    reason:
      'No matching versioned lesson practice exists. Diagnostic findings are not lesson mastery.',
  };
  if (!moduleVersionId)
    return {
      ...empty,
      status: 'unsupported',
      reason:
        'No full interactive lesson is mapped to this exact subskill. Existing overviews supply no recorded independent mastery.',
    };
  const selectedRule = practiceContracts[moduleVersionId];
  if (!selectedRule)
    return {
      ...empty,
      status: 'version-mismatch',
      reason:
        'This lesson version has no approved selector evidence contract. Older records remain preserved without cross-version credit.',
    };
  const compatible = histories
    .filter((h) => h.moduleVersionId === moduleVersionId)
    .sort((a, b) => a.ordinal - b.ordinal || a.runId.localeCompare(b.runId));
  if (!compatible.length)
    return {
      ...empty,
      status: histories.some((h) => h.lessonId === selectedRule.lessonId)
        ? 'version-mismatch'
        : 'not-started',
      availableFreshForms:
        moduleVersionId === selectedRule.moduleVersionId ? selectedRule.forms : 0,
      reason: histories.some((h) => h.lessonId === selectedRule.lessonId)
        ? 'Practice belongs to another content version. It remains preserved but supplies no credit for this version.'
        : empty.reason,
    };
  const latest = compatible.at(-1)!;
  const submissions = compatible
    .flatMap((h) => h.attempts.map((a) => ({ ...a, runId: h.runId, ordinal: h.ordinal })))
    .sort(
      (a, b) =>
        Date.parse(a.at) - Date.parse(b.at) ||
        a.ordinal - b.ordinal ||
        a.attempt - b.attempt ||
        a.stepId.localeCompare(b.stepId),
    );
  for (const h of compatible) {
    if (
      !Number.isInteger(h.ordinal) ||
      h.ordinal < 1 ||
      !Number.isInteger(h.hints) ||
      h.hints < 0 ||
      h.completed < 0 ||
      h.completed > h.total
    )
      throw new Error('Invalid practice evidence.');
    calendarDay(h.createdAt);
    h.attempts.forEach((a) => {
      calendarDay(a.at);
      if (!Number.isInteger(a.attempt) || a.attempt < 1 || a.first !== (a.attempt === 1))
        throw new Error('Invalid first-attempt evidence.');
    });
  }
  const first = new Map<string, (typeof submissions)[number]>();
  for (const a of submissions) if (a.first && !first.has(a.stepId)) first.set(a.stepId, a);
  const checkpoints = selectedRule.checkpoints.flatMap((id) =>
    first.get(id) ? [first.get(id)!] : [],
  );
  const finals = new Map<number, (typeof submissions)[number]>();
  for (const a of submissions)
    if (
      a.stepId === selectedRule.final &&
      a.first &&
      a.ordinal <= selectedRule.forms &&
      !finals.has(a.ordinal)
    )
      finals.set(a.ordinal, a);
  const freshFinals = [...finals.values()].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.ordinal - b.ordinal,
  );
  const passes = freshFinals.filter((a) => a.correct && !a.assisted).length;
  const misses = freshFinals.filter((a) => !a.correct && !a.assisted).length;
  const matches = checkpoints.filter((a) => a.correct && !a.assisted).length;
  const wrong = checkpoints.filter((a) => !a.correct && !a.assisted).length;
  const assisted = checkpoints.filter((a) => a.assisted).length;
  const latestFinal = freshFinals.at(-1);
  const hints = compatible.reduce((sum, h) => sum + h.hints, 0);
  const repeated = submissions.filter(
    (a) => selectedRule.checkpoints.includes(a.stepId) && a.correct && first.get(a.stepId) !== a,
  );
  const independent = [...checkpoints, ...freshFinals].filter((a) => !a.assisted);
  const settled =
    freshFinals.length >= 2 && freshFinals.slice(-2).every((a) => a.correct && !a.assisted);
  const inconsistent = !settled && ((passes > 0 && misses > 0) || (matches >= 2 && wrong >= 2));
  const demonstrated =
    latestFinal?.correct &&
    !latestFinal.assisted &&
    ((matches >= selectedRule.required && passes >= 1) || passes >= 2) &&
    !inconsistent;
  const status = inconsistent
    ? 'inconsistent'
    : demonstrated
      ? 'demonstrated'
      : assisted >= 2 || (hints >= 3 && !passes)
        ? 'guided'
        : submissions.length
          ? 'developing'
          : 'not-started';
  return {
    ...empty,
    status,
    completedSteps: latest.completed,
    totalSteps: latest.total,
    firstUnaidedMatches: matches,
    firstUnaidedMisses: wrong,
    firstAssisted: assisted,
    hintUses: hints,
    repeatedMatches: repeated.length,
    repeatedEasyMatches: repeated.filter((a) => selectedRule.easy.includes(a.stepId)).length,
    assistedFinals: freshFinals.filter((a) => a.assisted).length,
    freshFinalPasses: passes,
    freshFinalMisses: misses,
    availableFreshForms: Math.max(
      0,
      selectedRule.forms - Math.max(...compatible.map((h) => h.ordinal)),
    ),
    nextOrdinal: Math.max(...compatible.map((h) => h.ordinal)) + 1,
    finalAttempted: latest.attempts.some((a) => a.stepId === selectedRule.final),
    activeRunId: latest.runId,
    lastPracticeAt: submissions.at(-1)?.at,
    lastMeaningfulAt:
      independent.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1)?.at ??
      submissions[0]?.at,
    reason: `${matches}/${selectedRule.checkpoints.length} first-ever unaided checkpoint matches; ${wrong} unaided misses; ${assisted} assisted first checkpoints; ${hints} hint uses; ${passes} distinct fresh final passes and ${misses} fresh unaided final misses; ${freshFinals.filter((a) => a.assisted).length} assisted finals excluded. ${repeated.length} repeated checkpoint matches supply no new independent credit. Completion (${latest.completed}/${latest.total}) is shown separately. ${status === 'demonstrated' ? 'Preliminary practice mastery is limited to this lesson, not an entire competency.' : 'Further independent evidence is needed; completion and retries do not establish mastery.'}`,
  };
}

type Concept = {
  id: string;
  name: string;
  skillId?: string;
  finding?: Finding;
  item?: PathwayItem;
  prerequisites: string[];
};
function conceptsFor(bank: Bank, report: Report) {
  const pathway = buildPathway(bank, report, 'selector');
  const nodes = new Map<string, Concept>();
  const bySkill = new Map<string, string>();
  for (const item of pathway.items) {
    const id = `competency:${item.competencyId}`;
    if (item.existingSkillId) bySkill.set(item.existingSkillId, id);
    nodes.set(id, {
      id,
      name: item.name,
      skillId: item.existingSkillId,
      item,
      finding: report.findings.find((f) => f.competencyId === item.competencyId),
      prerequisites: [],
    });
  }
  function skillNode(skillId: string): string {
    const known = bySkill.get(skillId);
    if (known) return known;
    const id = `skill:${skillId}`;
    if (!nodes.has(id)) {
      const topic = pythonTopics.find((t) => `py-${t.key}` === skillId);
      if (!topic) throw new Error('Unknown learning prerequisite.');
      nodes.set(id, { id, skillId, name: topic.name, prerequisites: [] });
      nodes.get(id)!.prerequisites = topic.prerequisites.map((key) => skillNode(`py-${key}`));
    }
    return id;
  }
  for (const node of [...nodes.values()]) {
    const competency = bank.competencies.find((c) => c.id === node.item?.competencyId);
    node.prerequisites = [
      ...new Set([
        ...(competency?.prerequisites.map((id) => `competency:${id}`) ?? []),
        ...(node.item?.prerequisites.map(skillNode) ?? []),
      ]),
    ];
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function validate(id: string) {
    if (visiting.has(id)) throw new Error('Learning prerequisite cycle.');
    if (visited.has(id)) return;
    const node = nodes.get(id);
    if (!node) throw new Error('Missing learning prerequisite.');
    visiting.add(id);
    node.prerequisites.forEach(validate);
    visiting.delete(id);
    visited.add(id);
  }
  nodes.forEach((node) => validate(node.id));
  return nodes;
}

export function selectLearningV1(input: {
  bank: Bank;
  report: Report;
  sourceRunId: string;
  histories: PracticeHistory[];
  now: string;
}): LearningRecommendation {
  const asOfDay = calendarDay(input.now);
  const nodes = conceptsFor(input.bank, input.report);
  if (!nodes.size) throw new Error('No diagnostic learning findings.');
  const history = input.histories;
  const practice = (node: Concept) => summarizePractice(history, node.item?.moduleVersionId);
  const review = (p: PracticeSummary): LearningRecommendation['review'] => {
    if (p.status === 'version-mismatch') return { status: 'content-update', reason: p.reason };
    if (!p.lastPracticeAt)
      return {
        status: 'not-started',
        reason: 'No submitted practice is recorded for this content version.',
      };
    const intervalDays =
      p.status === 'demonstrated'
        ? [7, 14, 30][Math.min(2, Math.max(0, p.freshFinalPasses - 1))]
        : p.status === 'inconsistent'
          ? 2
          : 1;
    const dueDay = addDays(calendarDay(p.lastMeaningfulAt ?? p.lastPracticeAt), intervalDays);
    return {
      status:
        dueDay <= asOfDay ? 'due' : p.status === 'demonstrated' ? 'not-due' : 'verification-needed',
      dueDay,
      intervalDays,
      reason: `${intervalDays} calendar-day instructional interval from meaningful submitted evidence; visits, hints and repeated matches do not postpone review. This is a deterministic scheduling default, not a calibrated forgetting model.`,
    };
  };
  const goals = [...nodes.values()]
    .filter((n) => n.finding)
    .sort((a, b) => {
      const due = (n: Concept) => (review(practice(n)).status === 'due' ? 0 : 1);
      const rank = (n: Concept) =>
        practice(n).status === 'demonstrated' && review(practice(n)).status === 'not-due'
          ? 3
          : n.finding?.status === 'Likely gap'
            ? 0
            : n.finding?.status === 'Insufficient evidence'
              ? 1
              : 2;
      return (
        due(a) - due(b) ||
        rank(a) - rank(b) ||
        [...nodes.keys()].indexOf(a.id) - [...nodes.keys()].indexOf(b.id)
      );
    });
  const goal = goals[0];
  let selected = goal;
  const supported = (node: Concept) => node.finding?.status === 'Demonstrated strength';
  function unmet(node: Concept): Concept | undefined {
    for (const id of node.prerequisites) {
      const p = nodes.get(id)!;
      const earlier = unmet(p);
      if (earlier) return earlier;
      if (!supported(p)) return p;
    }
  }
  selected = unmet(goal) ?? goal;
  const p = practice(selected),
    r = review(p);
  const diagnosticEvidence = !selected.finding
    ? 'not-assessed'
    : selected.finding.status === 'Likely gap'
      ? 'likely-gap'
      : selected.finding.status === 'Insufficient evidence'
        ? 'uncertain'
        : 'strength';
  const prerequisite = selected.id !== goal.id;
  const reasonCode = prerequisite
    ? diagnosticEvidence === 'likely-gap'
      ? 'prerequisite-gap'
      : 'prerequisite-uncertainty'
    : r.status === 'due'
      ? 'review-due'
      : diagnosticEvidence === 'likely-gap'
        ? 'address-likely-gap'
        : diagnosticEvidence === 'uncertain' || diagnosticEvidence === 'not-assessed'
          ? 'resolve-uncertainty'
          : 'independent-verification';
  const difficulty: 1 | 2 | 3 =
    prerequisite ||
    p.status === 'guided' ||
    (p.firstUnaidedMisses >= 3 && p.firstUnaidedMatches <= 1) ||
    (!p.lastPracticeAt && diagnosticEvidence !== 'strength')
      ? 1
      : p.repeatedEasyMatches >= 3
        ? 2
        : p.status === 'demonstrated' ||
            (diagnosticEvidence === 'strength' && !p.firstUnaidedMisses)
          ? 3
          : 2;
  const active = !!p.activeRunId && !p.finalAttempted && p.completedSteps < p.totalSteps;
  const fresh = (active && p.nextOrdinal - 1 <= rule.forms) || p.availableFreshForms > 0;
  const href = selected.item?.moduleVersionId
    ? `/diagnostic-v2/learn/variables?source=${encodeURIComponent(input.sourceRunId)}&competency=${encodeURIComponent(selected.item.competencyId)}`
    : (selected.item?.legacyHref ??
      (selected.skillId
        ? `/diagnostic-v2/learn?skill=${encodeURIComponent(selected.skillId)}`
        : undefined));
  const available = !!selected.item?.moduleVersionId && fresh;
  return {
    selectorVersion: 'learning-revision-1-draft.1',
    mappingVersion: PATHWAY_VERSION,
    sourceRunId: input.sourceRunId,
    asOfDay,
    schedulingTimezone: SCHEDULING_TIMEZONE,
    noAssessmentCredit: true,
    concept: {
      id: selected.id,
      name: selected.name,
      skillId: selected.skillId,
      competencyId: selected.item?.competencyId,
      subskill: selected.finding?.nextSubskill,
    },
    reasonCode,
    prerequisiteFor: prerequisite ? goal.name : undefined,
    diagnosticEvidence,
    reason: `${prerequisite ? `Before ${goal.name}, investigate prerequisite ${selected.name}. ` : ''}${diagnosticEvidence === 'likely-gap' ? 'The completed diagnostic reports a likely gap, not a proven inability.' : diagnosticEvidence === 'strength' ? 'The diagnostic supplies preliminary strength evidence; it is not lesson mastery.' : 'Evidence is uncertain or absent, not demonstrated weakness.'} ${selected.finding?.reason ?? 'There is no direct diagnostic finding for this graph prerequisite.'} ${p.reason}${r.status === 'due' ? ` Review was due on ${r.dueDay}.` : ''}`,
    suggestedDifficulty: difficulty,
    difficultyReason:
      difficulty === 1
        ? 'Use a scaffolded foundation task, then an applied fresh check; easy repetitions alone cannot establish mastery.'
        : difficulty === 3
          ? 'Prefer a new transfer challenge because prior independent evidence supports stretching. Availability is shown separately.'
          : p.repeatedEasyMatches >= 3
            ? 'Repeated easy-item matches earn no further credit. Switch to a new applied contrast or obtain an unexposed variant.'
            : 'Use an applied contrast and a fresh independent check to resolve mixed or incomplete evidence.',
    review: r,
    practice: p,
    variant: {
      fresh: available,
      available,
      ordinal: available ? (active ? p.nextOrdinal - 1 : p.nextOrdinal) : undefined,
      reason: available
        ? active
          ? 'Resume the current run; only its unused final form can provide fresh evidence. Repeated checkpoints remain exposed.'
          : `The next owned practice run can use fresh final form ${p.nextOrdinal}. Repeated checkpoint questions supply no new independent credit.`
        : selected.item?.moduleVersionId
          ? 'All three authored final forms are already exposed. Review is available, but a newly authored variant is needed for further independent verification.'
          : 'No full interactive challenge contract is mapped to this exact subskill. The existing overview is instructional only.',
    },
    action: {
      kind: active
        ? 'resume'
        : available
          ? 'fresh-verification'
          : selected.item?.moduleVersionId
            ? 'content-needed'
            : href
              ? 'guided-practice'
              : 'content-needed',
      href,
      label: active
        ? 'Resume this lesson'
        : available
          ? 'Open lesson for a fresh check'
          : selected.item?.moduleVersionId
            ? 'Review exposed lesson content'
            : 'Open existing guided practice',
      coverage:
        selected.item?.coverage ??
        'Prerequisite overview only; independent assessment of the full prerequisite is still needed.',
    },
    evidence: {
      diagnosticReason: selected.finding?.reason ?? 'Not directly assessed',
      prerequisiteSupport: selected.prerequisites.map(
        (id) =>
          `${nodes.get(id)!.name}: ${supported(nodes.get(id)!) ? 'supported by preliminary diagnostic strength' : 'uncertain or likely gap; partial lesson mastery does not clear the full prerequisite'}`,
      ),
      learningRunIds: history
        .filter((h) => h.moduleVersionId === selected.item?.moduleVersionId)
        .map((h) => h.runId)
        .sort(),
    },
  };
}

/** V2 corrects recommendation intent; historical V1 decisions remain sealed in storage. */
export function selectLearning(
  input: Parameters<typeof selectLearningV1>[0],
): LearningRecommendation {
  const previous = selectLearningV1(input);
  const nodes = conceptsFor(input.bank, input.report);
  const ordered = [...nodes.values()].filter((n) => n.finding);
  const supportedGap = (n: Concept) =>
    n.finding?.status === 'Likely gap' &&
    n.finding.independent >= input.bank.policy.coverage &&
    (n.finding.incorrect ?? n.finding.independent - n.finding.correct) >= 2;
  const allStrong =
    input.report.findings.length === input.bank.competencies.length &&
    input.report.findings.every(
      (f) =>
        f.status === 'Demonstrated strength' &&
        f.independent >= input.bank.policy.coverage &&
        f.correct === f.independent &&
        !(f.unsure ?? 0) &&
        !(f.assistedCount ?? f.count - f.independent),
    );
  let selected =
    ordered.find(supportedGap) ??
    ordered.find((n) => n.finding?.status === 'Insufficient evidence') ??
    ordered[0];
  let category: NonNullable<LearningRecommendation['category']> = supportedGap(selected)
    ? 'remediation'
    : 'verification';
  let prerequisiteFor: string | undefined;
  // Unknown preparation is a suggestion, never a compulsory beginner intervention.
  function evidencedPrerequisite(node: Concept): Concept | undefined {
    for (const id of node.prerequisites) {
      const candidate = nodes.get(id)!;
      const earlier = evidencedPrerequisite(candidate);
      if (earlier) return earlier;
      if (supportedGap(candidate)) return candidate;
    }
  }
  if (category === 'remediation') {
    const unmet = evidencedPrerequisite(selected);
    if (unmet) {
      prerequisiteFor = selected.name;
      selected = unmet;
    }
  }
  let lessonId = selected.item
    ? instructionalLesson(selected.item.moduleSkillId, selected.finding?.nextSubskill)
    : undefined;
  if (allStrong) {
    category = 'advanced';
    lessonId = 'python-transfer-manifest';
    // Only actual independent misses can change the primary suggestion; mere incompletion or hints cannot.
    for (const id of [
      'python-variables-references',
      'python-values-division',
      'python-loop-boundaries',
      'python-transfer-manifest',
    ]) {
      const evidence = summarizePractice(input.histories, `${id}@1.0.0-draft.1`);
      if (
        evidence.status !== 'demonstrated' &&
        (evidence.firstUnaidedMisses >= 2 || evidence.freshFinalMisses > 0)
      ) {
        category = 'verification';
        lessonId = id;
        selected =
          ordered.find((n) =>
            id === 'python-variables-references'
              ? ['collections', 'collections8'].includes(n.item?.competencyId ?? '')
              : ['values', 'fundamentals'].includes(n.item?.competencyId ?? ''),
          ) ?? selected;
        break;
      }
    }
  }
  const moduleVersion = lessonId ? `${lessonId}@1.0.0-draft.1` : undefined;
  const p = summarizePractice(input.histories, moduleVersion);
  const latest = input.histories
    .filter((h) => h.moduleVersionId === moduleVersion)
    .sort((a, b) => b.ordinal - a.ordinal || b.createdAt.localeCompare(a.createdAt))[0];
  const interval =
    p.status === 'demonstrated'
      ? [7, 14, 30][Math.min(2, Math.max(0, p.freshFinalPasses - 1))]
      : p.status === 'inconsistent'
        ? 2
        : 1;
  const dueDay = p.lastPracticeAt
    ? addDays(calendarDay(p.lastMeaningfulAt ?? p.lastPracticeAt), interval)
    : undefined;
  const active = !!latest && latest.completed < latest.total && !p.finalAttempted;
  const available = !!lessonId && ((active && latest.ordinal <= 3) || p.availableFreshForms > 0);
  const href = lessonId
    ? lessonHref(lessonId, input.sourceRunId, `course:${lessonId}`)
    : selected.item?.legacyHref;
  const latestLessons = new Map<string, PracticeHistory>();
  for (const h of [...input.histories].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.ordinal - b.ordinal,
  ))
    latestLessons.set(h.lessonId, h);
  const continueLearning = [...latestLessons.values()]
    .filter(
      (h) =>
        h.status !== 'completed' &&
        h.completed < h.total &&
        (h.completed > 0 || h.attempts.length > 0) &&
        Object.hasOwn(lessonNavigation, h.lessonId),
    )
    .map((h) => ({
      runId: h.runId,
      title: h.title ?? lessonNavigation[h.lessonId].title,
      completed: h.completed,
      total: h.total,
      currentStep: h.currentStepTitle,
      href: `/diagnostic-v2/learn/lesson?lesson=${encodeURIComponent(h.lessonId)}&run=${encodeURIComponent(h.runId)}`,
    }));
  const simpleReason =
    category === 'advanced'
      ? 'You answered consistently without diagnostic hints across the assessed areas. Try a new practical contract that combines several skills.'
      : allStrong
        ? 'Your diagnostic showed strength, while later independent practice gave a different signal. Check this specific concept with a fresh case; your diagnostic result stays as recorded.'
        : category === 'remediation'
          ? `${prerequisiteFor ? `Before ${prerequisiteFor}, work on ` : 'Repeated independent difficulty points to '}${selected.finding?.nextSubskill ?? selected.name}. Use a focused lesson, then verify on a new case.`
          : `The evidence for ${selected.finding?.nextSubskill ?? selected.name} is incomplete or conflicting. A fresh targeted check will help clarify it.`;
  const preparation: Record<string, string[]> = {
    'python-values-division': [],
    'python-loop-boundaries': ['Values and assignment'],
    'python-variables-references': ['Names and assignment'],
    'python-transfer-manifest': ['Iteration', 'Validation', 'Collections'],
  };
  return {
    ...previous,
    selectorVersion: LEARNING_SELECTOR_VERSION,
    category,
    prerequisiteFor,
    concept:
      category === 'advanced'
        ? {
            id: 'advanced-transfer',
            name: 'Build a dispatch manifest',
            subskill: 'Validation, iteration and capacity decisions',
          }
        : {
            id: selected.id,
            name:
              allStrong && lessonId
                ? lessonNavigation[lessonId].title
                : (selected.finding?.nextSubskill ?? selected.name),
            subskill: selected.name,
            competencyId: selected.item?.competencyId,
            skillId: selected.skillId,
          },
    diagnosticEvidence: allStrong
      ? 'strength'
      : category === 'remediation'
        ? 'likely-gap'
        : 'uncertain',
    reasonCode:
      category === 'advanced'
        ? 'strong-transfer'
        : allStrong
          ? 'verify-practice-contrast'
          : prerequisiteFor
            ? 'prerequisite-gap'
            : category === 'remediation'
              ? 'targeted-gap'
              : 'targeted-uncertainty',
    reason: !lessonId
      ? simpleReason +
        ' An independent interactive check for this exact topic is not available yet; the linked overview does not verify proficiency.'
      : lessonId && !available
        ? simpleReason +
          ' The authored independent variants are already exposed; review is available, but another fresh task must be authored.'
        : simpleReason,
    suggestedDifficulty: category === 'advanced' ? 3 : category === 'remediation' ? 1 : 2,
    difficultyReason:
      category === 'advanced'
        ? 'A new multi-step application task builds on the sampled strengths.'
        : category === 'remediation'
          ? 'Use a short explanation and scaffolded practice before the independent check.'
          : 'Use a new contrasting case before deciding whether more instruction is needed.',
    practice: p,
    review: {
      status:
        p.status === 'version-mismatch'
          ? 'content-update'
          : !dueDay
            ? 'not-started'
            : dueDay <= previous.asOfDay
              ? 'due'
              : p.status === 'demonstrated'
                ? 'not-due'
                : 'verification-needed',
      dueDay,
      intervalDays: dueDay ? interval : undefined,
      reason:
        'Review timing uses meaningful submitted evidence. An unfinished lesson is a continuation option, not evidence of a diagnostic weakness.',
    },
    variant: {
      available,
      fresh: available && !active,
      ordinal: available ? (active ? latest!.ordinal : p.nextOrdinal) : undefined,
      reason: available
        ? active
          ? 'Continue the current activity; earlier exposed questions supply no new independent credit.'
          : 'A new final-task variant is available. Open the activity and choose a new practice run if you have completed an earlier run.'
        : 'The existing content can be reviewed. A newly authored variant is needed for more independent evidence.',
    },
    action: {
      kind: !lessonId
        ? 'content-needed'
        : active
          ? 'resume'
          : available
            ? 'fresh-verification'
            : lessonId
              ? 'review'
              : 'guided-practice',
      href,
      label: !lessonId
        ? 'Read concept overview · interactive check pending'
        : !available && lessonId
          ? 'Review activity · fresh variants exhausted'
          : category === 'advanced'
            ? active
              ? 'Continue transfer challenge'
              : 'Start transfer challenge'
            : category === 'verification'
              ? 'Open targeted verification'
              : 'Start focused lesson',
      coverage:
        category === 'advanced'
          ? 'A new applied task, not a claim of complete Python mastery.'
          : lessonId
            ? 'Focused instruction and a separate independent check.'
            : 'A full interactive lesson for this exact topic is not authored yet; the overview explains available next steps.',
    },
    continueLearning,
    learningMap: Object.keys(preparation).map((id) => {
      const h = latestLessons.get(id);
      return {
        id,
        title: lessonNavigation[id].title,
        prerequisites: preparation[id],
        recommended: id === lessonId,
        completed: h?.status === 'completed',
        progress: h ? `${h.completed}/${h.total} steps` : undefined,
        href: lessonHref(id, input.sourceRunId, `course:${id}`),
      };
    }),
    evidence: {
      diagnosticReason: selected.finding?.reason ?? previous.evidence.diagnosticReason,
      prerequisiteSupport: selected.prerequisites.map(
        (id) =>
          `${nodes.get(id)!.name}: ${supportedGap(nodes.get(id)!) ? 'independent diagnostic difficulty supports this preparation' : 'optional preparation; no mandatory lock'}`,
      ),
      learningRunIds: input.histories
        .filter((h) => h.moduleVersionId === moduleVersion)
        .map((h) => h.runId)
        .sort(),
    },
  };
}
