import { expect, it } from 'vitest';
import {
  selectLearningV1 as selectLearning,
  summarizePractice,
} from '../src/lib/learning-studio/selector';
import { VARIABLES_MODULE } from '../src/lib/learning-studio/pathway';
import {
  learnerSimulations,
  practiceHistory,
  simulationBank,
  simulationReport,
} from './fixtures/learning-profiles';

it('explains six deterministic learner journeys from real synthetic evidence without changing inputs', () => {
  const profiles = learnerSimulations(),
    original = JSON.stringify(profiles);
  const decisions = profiles.map(selectLearning);
  expect(decisions[0].concept.competencyId).toBe('values');
  expect(decisions[0].reasonCode).toBe('prerequisite-uncertainty');
  expect(decisions[0].reason).toContain('not demonstrated weakness');
  expect(decisions[1].suggestedDifficulty).toBe(3);
  expect(decisions[2].practice.status).toBe('developing');
  expect(decisions[2].suggestedDifficulty).toBe(1);
  expect(decisions[3].practice.status).toBe('inconsistent');
  expect(decisions[4].practice.status).toBe('guided');
  expect(decisions[4].practice.firstUnaidedMatches).toBe(0);
  expect(decisions[4].practice.hintUses).toBe(5);
  expect(decisions[4].practice.assistedFinals).toBe(1);
  expect(decisions[5].review.status).toBe('due');
  expect(decisions[5].concept.competencyId).toBe('collections');
  for (let index = 0; index < profiles.length; index++) {
    expect(selectLearning(profiles[index])).toEqual(decisions[index]);
    expect(decisions[index].noAssessmentCredit).toBe(true);
    expect(decisions[index].reason).toContain(decisions[index].evidence.diagnosticReason);
  }
  expect(JSON.stringify(profiles)).toBe(original);
});

it('puts unmet prerequisites first and never clears a broad prerequisite with partial lesson mastery', () => {
  const profile = learnerSimulations()[0];
  profile.histories = [practiceHistory()];
  const decision = selectLearning(profile);
  expect(decision.concept.competencyId).toBe('values');
  expect(decision.diagnosticEvidence).toBe('uncertain');
  expect(decision.practice.status).not.toBe('demonstrated');
  const bank = structuredClone(simulationBank);
  bank.competencies[0].prerequisites = ['collections'];
  expect(() => selectLearning({ ...profile, bank })).toThrow('cycle');
});

it('completion, hints, retries, repeated easy items and recycled final forms do not manufacture mastery', () => {
  const guided = practiceHistory({ assisted: true, hints: 8 });
  for (let ordinal = 1; ordinal <= 5; ordinal++) {
    const history = practiceHistory({
      ordinal,
      correct: [true, false, false, false, false],
      final: false,
    });
    if (ordinal === 1) guided.attempts = history.attempts;
  }
  const runs = [
    guided,
    ...[2, 3, 4, 5].map((ordinal) => practiceHistory({ ordinal, final: false })),
  ];
  const summary = summarizePractice(runs, VARIABLES_MODULE);
  expect(summary.status).not.toBe('demonstrated');
  expect(summary.firstUnaidedMatches).toBe(1);
  expect(summary.repeatedEasyMatches).toBe(4);
  expect(summary.availableFreshForms).toBe(0);
  const profile = learnerSimulations()[2];
  profile.histories = runs;
  const decision = selectLearning(profile);
  expect(decision.variant.available).toBe(false);
  expect(decision.action.kind).toBe('content-needed');
  const recycled = practiceHistory({ ordinal: 4 });
  recycled.status = 'started';
  recycled.completed = 1;
  recycled.attempts = [];
  expect(selectLearning({ ...profile, histories: [recycled] }).variant.available).toBe(false);
});

it('fresh independent contrasts can resolve earlier learning difficulty without overwriting first attempts', () => {
  const runs = [
    practiceHistory({ correct: [true, false, true, false, false], final: false }),
    practiceHistory({ ordinal: 2, at: '2026-11-02T11:00:00.000Z' }),
    practiceHistory({ ordinal: 3, at: '2026-11-02T12:00:00.000Z' }),
  ];
  const summary = summarizePractice(runs, VARIABLES_MODULE);
  expect(summary.status).toBe('demonstrated');
  expect(summary.firstUnaidedMisses).toBe(3);
  expect(summary.freshFinalPasses).toBe(2);
});

it('uses meaningful evidence for review instead of letting easy replays postpone it', () => {
  const original = practiceHistory({ at: '2026-09-01T10:00:00.000Z' });
  const repeated = practiceHistory({ ordinal: 4, at: '2026-11-03T10:00:00.000Z' });
  const decision = selectLearning({ ...learnerSimulations()[5], histories: [original, repeated] });
  expect(decision.review.status).toBe('due');
  expect(decision.review.dueDay).toBe('2026-09-08');
  expect(decision.practice.lastPracticeAt).toBe('2026-11-03T10:00:00.000Z');
  expect(decision.practice.lastMeaningfulAt).toBe('2026-09-01T10:00:00.000Z');
});

it('keeps old content versions separate and rejects malformed evidence', () => {
  const old = practiceHistory();
  old.moduleVersionId = 'python-variables-references@older';
  const summary = summarizePractice([old], VARIABLES_MODULE);
  expect(summary.status).toBe('version-mismatch');
  expect(summary.firstUnaidedMatches).toBe(0);
  const invalid = practiceHistory();
  invalid.attempts[0].at = 'not a date';
  expect(() => summarizePractice([invalid], VARIABLES_MODULE)).toThrow('date');
  invalid.attempts[0].at = '2026-11-01T12:00:00Z';
  invalid.attempts[0].first = false;
  expect(() => summarizePractice([invalid], VARIABLES_MODULE)).toThrow('first-attempt');
  expect(() =>
    selectLearning({
      bank: simulationBank,
      report: simulationReport(),
      sourceRunId: 'synthetic',
      histories: [],
      now: 'invalid',
    }),
  ).toThrow('date');
});

it('uses the declared learner calendar day at review boundaries and rejects cross-role inference', () => {
  const profile = learnerSimulations()[5];
  profile.histories = [practiceHistory({ at: '2026-11-02T18:45:00.000Z' })];
  const before = selectLearning({ ...profile, now: '2026-11-09T18:29:00.000Z' });
  expect(before.concept.competencyId).not.toBe('collections');
  const due = selectLearning({ ...profile, now: '2026-11-09T18:30:00.000Z' });
  expect(due.concept.competencyId).toBe('collections');
  expect(due.asOfDay).toBe('2026-11-10');
  expect(due.review.dueDay).toBe('2026-11-10');
  expect(due.schedulingTimezone).toBe('Asia/Kolkata');
  expect(() =>
    selectLearning({ ...profile, bank: { ...profile.bank, roleId: 'java-developer' } }),
  ).toThrow();
});
