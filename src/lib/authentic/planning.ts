import { compareScores, planGaps, readiness } from '../engine';
import type { Score, Skill } from '../types';
import type { PublicRepair } from './types';
export function explainChange(before: Score[], after: Score[], skills: Skill[]) {
  const comparison = compareScores(before, after, skills);
  const improved = comparison.filter((c) => c.change > 0),
    declined = comparison.filter((c) => c.change < 0),
    unchanged = comparison.filter((c) => c.change === 0);
  const newGaps = comparison.filter((c) => c.before >= c.target && c.after < c.target);
  const limited = after.filter((s) => !s.quality || s.quality.strength === 'Limited evidence');
  const newlyMeasured = after.filter(
    (s) =>
      (s.quality?.cumulativeCount ?? s.evidence) >
      (before.find((b) => b.skillId === s.skillId)?.quality?.cumulativeCount ??
        before.find((b) => b.skillId === s.skillId)?.evidence ??
        0),
  );
  const weakNewEvidence = newlyMeasured.filter(
    (s) => s.score < (skills.find((k) => k.id === s.skillId)?.target ?? 0),
  );
  const name = (id: string) => skills.find((s) => s.id === id)?.name ?? id;
  const start = readiness(before, skills),
    end = readiness(after, skills);
  return {
    improved,
    declined,
    unchanged,
    newGaps,
    limited,
    newlyMeasured,
    weakNewEvidence,
    text: `Your importance-weighted readiness ${end > start ? 'rose' : end < start ? 'fell' : 'stayed flat'} from ${start}% to ${end}%. ${improved.length} skills improved, ${declined.length} declined and ${unchanged.length} stayed unchanged. ${newGaps.length ? `New below-target skills: ${newGaps.map((s) => s.name).join(', ')}.` : 'No newly discovered below-target skills.'} ${weakNewEvidence.length ? `Additional evidence revealed below-target performance in ${weakNewEvidence.map((s) => name(s.skillId)).join(', ')}.` : ''} ${limited.length} skills have limited evidence. A weighted average can rise while an individual skill crosses below its own target; the gap count and overall indicator measure different things.`,
  };
}
export function repairPlan(
  scores: Score[],
  skills: Skill[],
  modules: PublicRepair[],
  mastered: string[],
) {
  const gaps = planGaps(scores, skills);
  const pending = gaps.filter((g) => !mastered.includes(g.id));
  const days = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    skills: [] as string[],
    minutes: 0,
    action: '',
  }));
  days[6].minutes = 120; // Fresh authentic banks take 90–120 minutes.
  // Preserve prerequisite order, balancing the remaining effort across six repair days.
  let day = 0;
  for (const gap of pending) {
    const effort = modules.find((m) => m.skillId === gap.id)?.minutes ?? 20;
    if (
      day < 5 &&
      days[day].minutes > 0 &&
      days[day].minutes + effort > Math.max(45, (pending.length * 35) / 6)
    )
      day++;
    days[day].skills.push(gap.id);
    days[day].minutes += effort;
  }
  for (const d of days)
    d.action =
      d.day === 7
        ? 'Verify in a fresh reassessment bank; compare assessed evidence, not lesson completion.'
        : d.skills.length
          ? 'Concept repair → guided exercise → independent task → workplace/transfer check.'
          : 'Review completed modules, revisit hints and verify a remaining limited-evidence signal.';
  return days;
}
