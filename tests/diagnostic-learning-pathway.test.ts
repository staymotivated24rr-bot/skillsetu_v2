import { expect, it } from 'vitest';
import { buildPathway, competencyLinks, PATHWAY_VERSION } from '../src/lib/learning-studio/pathway';
import { blockDiagnostic } from '../src/lib/diagnostic/block-bank';
import { starterDiagnostic } from '../src/lib/diagnostic/starter-v3/bank';
import { makeReport } from '../src/lib/diagnostic/engine';

it('preserves report learning order, reasons and prerequisites without mutating report or bank', () => {
  const report = makeReport(blockDiagnostic, [], 'synthetic fixture');
  report.learningOrder = ['collections', 'values'];
  report.findings.find((f) => f.competencyId === 'collections')!.nextSubskill = 'aliasing';
  const before = JSON.stringify({ report, bank: blockDiagnostic });
  const pathway = buildPathway(blockDiagnostic, report, 'owned-source');
  expect(pathway.version).toBe(PATHWAY_VERSION);
  expect(pathway.items.slice(0, 2).map((i) => i.competencyId)).toEqual(report.learningOrder);
  expect(pathway.items[0].moduleVersionId).toContain('python-variables-references@');
  expect(pathway.items[0].existingSkillId).toBe('py-structures');
  expect(pathway.items[0].coverage).toContain('Partial');
  expect(pathway.items[0].reason).toContain(report.findings[1].reason);
  expect(JSON.stringify({ report, bank: blockDiagnostic })).toBe(before);
});

it('accounts explicitly for all eight competencies and 120 families, without pretending they have full lessons', () => {
  expect(competencyLinks).toHaveLength(14);
  const report = makeReport(starterDiagnostic, [], 'synthetic fixture');
  const families = new Map(starterDiagnostic.questions.map((q) => [q.exposureFamily!, q]));
  expect(families.size).toBe(120);
  for (const question of families.values()) {
    const local = structuredClone(report);
    local.findings.find((f) => f.competencyId === question.competencyId)!.nextSubskill =
      question.subskill;
    const item = buildPathway(starterDiagnostic, local, 'synthetic').items.find(
      (i) => i.competencyId === question.competencyId,
    )!;
    expect(item.legacyHref).toContain('/diagnostic-v2/learn?skill=starter-');
    expect(
      item.moduleVersionId
        ? item.coverage.startsWith('Partial')
        : item.coverage.includes('not yet available'),
    ).toBe(true);
  }
  report.findings.find((f) => f.competencyId === 'dsa')!.nextSubskill = 'Binary search';
  const dsa = buildPathway(starterDiagnostic, report, 'synthetic').items.find(
    (i) => i.competencyId === 'dsa',
  )!;
  expect(dsa.legacyHref).toContain('subskill=Binary%20search');
  expect(dsa.introduction).toBeUndefined(); // No unrelated graph-algorithm substitution.
});

it('fails closed on unmatched competency/module identities and preserves strength-only recommendations as optional', () => {
  const report = makeReport(blockDiagnostic, [], 'synthetic');
  report.learningOrder = [];
  report.findings[0].moduleSkillId = 'starter-fundamentals';
  const items = buildPathway(blockDiagnostic, report, 'source').items;
  expect(items.every((i) => !i.priority)).toBe(true);
  expect(items[0].legacyHref).toBeUndefined();
  expect(items[0].coverage).toContain('Unmapped');
  expect(() =>
    buildPathway({ ...blockDiagnostic, roleId: 'java-developer' }, report, 'source'),
  ).toThrow();
});
