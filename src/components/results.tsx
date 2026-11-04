'use client';
import { explainChange } from '@/lib/authentic/planning';
import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  Printer,
  Target,
} from 'lucide-react';
import type { DemoState } from '@/lib/types';
import {
  compareScores,
  disclaimer,
  meetsRequirements,
  planGaps,
  readiness,
  readinessLabel,
} from '@/lib/engine';
import { Empty, Meter, SkillTable, Stat, Steps } from './ui';
export function Results({
  state,
  report,
  busy,
  learn,
  reassess,
}: {
  state: DemoState;
  report: boolean;
  busy: boolean;
  learn: (id?: string) => void;
  reassess: () => Promise<void>;
}) {
  const completed = state.attempts.filter((a) => a.status === 'complete');
  const original = completed.find((a) => a.kind === 'diagnostic');
  const [selectedReport, setSelectedReport] = useState('');
  const latest = completed.find((a) => a.id === selectedReport) ?? completed.at(-1);
  const [review, setReview] = useState<
    {
      questionId: string;
      prompt: string;
      scenario: string;
      selected: string;
      correct: boolean;
      explanation: string;
    }[]
  >([]);
  const [reviewError, setReviewError] = useState('');
  const [showReview, setShowReview] = useState(false);
  if (!original || !latest)
    return (
      <Empty
        title="Your evidence starts with the diagnostic."
        text="Complete three workplace cases to see your skill scores, prioritized gaps, and prototype readiness report."
      />
    );
  const reportSkills = latest.skillSnapshot ?? state.skills;
  const scores = latest.scores;
  const gaps = planGaps(scores, reportSkills);
  const current = readiness(scores, reportSkills);
  const baseline =
    original.score ?? readiness(original.scores, original.skillSnapshot ?? reportSkills);
  const change = current - baseline;
  const comparison = compareScores(original.scores, scores, reportSkills);
  const improved = comparison.filter((c) => c.change > 0);
  const declined = comparison.filter((c) => c.change < 0);
  const strengths = [...comparison].sort((a, b) => b.after - a.after).slice(0, 3);
  const modules = [
    ...state.progress.filter((p) => p.status === 'mastered'),
    ...(state.repairProgress
      ?.filter((p) => p.status === 'mastered')
      .map((p) => ({ lessonId: 'lesson-' + p.skillId })) ?? []),
  ];
  const explanation = explainChange(original.scores, scores, reportSkills);
  const label = readinessLabel(scores, reportSkills);
  const reassessed = latest.kind === 'reassessment';
  async function toggleReview() {
    if (!showReview && !review.length) {
      try {
        const r = await fetch(`/api/demo?review=${latest!.id}`);
        if (!r.ok) throw new Error('Could not load your review. Try again.');
        setReview(await r.json());
      } catch (e) {
        setReviewError(e instanceof Error ? e.message : 'Could not load review.');
        return;
      }
    }
    setShowReview(!showReview);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {report ? 'YOUR ROLE-READINESS REPORT' : 'DIAGNOSIS → DIRECTION'}
          </span>
          <h1>{report ? 'Your progress, backed by evidence.' : 'Now you know where to focus.'}</h1>
          <p>
            {report
              ? `${state.user.name} · ${state.role.name} · ${new Date(latest.completedAt!).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'A practical snapshot of what you demonstrated — and your shortest path to the next level.'}
          </p>
        </div>
        {report && (
          <label className="role-switch">
            <span>Assessment report</span>
            <select
              aria-label="Assessment report"
              value={latest.id}
              onChange={(e) => {
                setSelectedReport(e.target.value);
                setReview([]);
                setShowReview(false);
              }}
            >
              {completed.map((a, i) => (
                <option key={a.id} value={a.id}>
                  {i + 1}. {a.kind} · {a.bankId ?? 'legacy-v1'} · {a.score}%
                </option>
              ))}
            </select>
          </label>
        )}
        {report && (
          <button className="btn btn-outline no-print" onClick={() => window.print()}>
            <Printer size={16} />
            Print report
          </button>
        )}
      </div>
      {latest.bankId && (
        <div className="assessment-provenance">
          <span>Bank: {latest.bankId}</span>
          <span>Assessment: {latest.assessmentVersion}</span>
          <span>Content: {latest.contentVersion}</span>
        </div>
      )}
      <Steps active={report ? 3 : reassessed ? 2 : 1} />
      <div className="report-hero">
        <div>
          <span className="eyebrow">{state.role.name.toUpperCase()} · PROTOTYPE INDICATOR</span>
          <h2>{label}</h2>
          <p>
            {gaps.length
              ? `${gaps.length} skill targets remain. ${gaps[0].name} is your next recommended focus.`
              : 'All role skill targets are met in this assessment. Keep testing your ability on more varied tasks.'}
          </p>
          <div className="tags">
            <span className="tag">
              {reassessed ? 'Reassessment evidence' : 'Diagnostic evidence'}
            </span>
            <span className="tag">{latest.answers.length} scored actions</span>
            <span className="tag">{reportSkills.length} measured skills</span>
          </div>
        </div>
        <div
          className="readiness-circle"
          style={{ '--score': `${current}%` } as React.CSSProperties}
        >
          <div>
            <b>
              {current}
              <small>%</small>
            </b>
            <span>Readiness indicator</span>
          </div>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          label="Original diagnostic"
          value={`${baseline}%`}
          detail="First completed diagnostic"
        />
        <Stat
          label="Current assessment"
          value={`${current}%`}
          detail={reassessed ? 'Latest completed reassessment' : 'Diagnostic — no reassessment yet'}
          accent
        />
        <Stat
          label="Measured change"
          value={`${change > 0 ? '+' : ''}${change} pts`}
          detail={reassessed ? 'Can increase, stay flat, or decline' : 'Reassess to measure change'}
        />
        <Stat
          label="Modules mastered"
          value={modules.length}
          detail="Based on submitted practice answers"
        />
      </div>
      {!report && (
        <div className="results-columns">
          <section className="card">
            <div className="section-title">
              <h2>Your strongest signals</h2>
              <ArrowUpRight size={20} />
            </div>
            {strengths.map((s) => (
              <div className="strength" key={s.id}>
                <div>
                  <b>{s.name}</b>
                  <span>{s.after}%</span>
                </div>
                <Meter value={s.after} target={s.target} label={s.name} />
                <small className="muted">
                  {s.after >= s.target
                    ? 'Meets role target'
                    : 'Still below target — strength is relative'}
                </small>
              </div>
            ))}
          </section>
          <section className="card priority-card">
            <span className="eyebrow">NEXT BEST STEP</span>
            <h2>{gaps[0]?.name ?? 'Continue building evidence'}</h2>
            <p>
              {gaps.length
                ? gaps[0].description
                : 'You met the targets in this short assessment. More varied real-world tasks will provide stronger evidence.'}
            </p>
            {gaps[0] && (
              <div className="target-line">
                <span>
                  {gaps[0].current}% <small>current</small>
                </span>
                <ArrowRight size={20} />
                <span>
                  {gaps[0].target}% <small>target</small>
                </span>
              </div>
            )}
            <button
              className="btn btn-primary"
              onClick={() => learn(gaps[0] ? `lesson-${gaps[0].id}` : undefined)}
            >
              {gaps.length ? 'Begin targeted learning' : 'Browse learning modules'}
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      <section className="card">
        <div className="section-title">
          <div>
            <span className="eyebrow">SKILL-BY-SKILL EVIDENCE</span>
            <h2>{reassessed ? 'Before → after' : 'Your diagnostic skill map'}</h2>
          </div>
          <span className="muted small">Markers show role targets</span>
        </div>
        <SkillTable
          skills={reportSkills}
          scores={scores}
          before={reassessed ? original.scores : undefined}
        />
        <p className="footnote">
          Each skill has only {Math.min(...scores.map((s) => s.evidence))}–
          {Math.max(...scores.map((s) => s.evidence))} mapped actions. Scores are coarse prototype
          signals, not precise or scientifically validated proficiency estimates. An incorrect
          action affects every skill mapped to it.
        </p>
      </section>
      {reassessed && (
        <section className="card score-explanation">
          <span className="eyebrow">UNDERSTAND THE CHANGE</span>
          <h2>Why did my result change?</h2>
          <p>{explanation.text}</p>
          <div className="tags">
            <span className="tag">{explanation.improved.length} improved</span>
            <span className="tag">{explanation.declined.length} declining</span>
            <span className="tag">{explanation.unchanged.length} unchanged</span>
            <span className="tag">{explanation.newGaps.length} newly discovered gaps</span>
          </div>
          <p className="small">
            Current gaps: {gaps.length}; baseline gaps:{' '}
            {planGaps(original.scores, original.skillSnapshot ?? reportSkills).length}.{' '}
            {explanation.newlyMeasured.length} skills received more opportunities than at baseline.
            Practice has added no points to either assessment.
          </p>
        </section>
      )}
      {reassessed && (
        <div className="results-columns">
          <section className="card">
            <h2>
              <ArrowUpRight size={20} />
              Improved skills
            </h2>
            {improved.length ? (
              improved.map((s) => (
                <div className="change-row" key={s.id}>
                  <span>{s.name}</span>
                  <b>
                    {s.before}% → {s.after}%
                  </b>
                  <span className="badge badge-green">+{s.change} pts</span>
                </div>
              ))
            ) : (
              <p>No measured increases in this reassessment.</p>
            )}
          </section>
          <section className="card">
            <h2>
              <ArrowDownRight size={20} />
              Skills to revisit
            </h2>
            {declined.length ? (
              declined.map((s) => (
                <div className="change-row" key={s.id}>
                  <span>{s.name}</span>
                  <b>
                    {s.before}% → {s.after}%
                  </b>
                  <span className="badge badge-warm">{s.change} pts</span>
                </div>
              ))
            ) : (
              <p>No measured declines. Unchanged skills are visible in the full table.</p>
            )}
          </section>
        </div>
      )}
      <section className="card">
        <div className="section-title">
          <div>
            <span className="eyebrow">TARGETED GAP REPAIR</span>
            <h2>{gaps.length ? 'Your remaining priorities' : 'Every role target met'}</h2>
          </div>
          <Target size={20} />
        </div>
        <div className="gap-list">
          {gaps.map((g, i) => (
            <div className="gap-row" key={g.id}>
              <span className="priority-number">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <b>{g.name}</b>
                <p>{g.reason}</p>
                {g.blockedBy.length > 0 && (
                  <small className="muted">
                    Prerequisites:{' '}
                    {g.blockedBy
                      .map((id) => reportSkills.find((s) => s.id === id)?.name)
                      .join(', ')}
                  </small>
                )}
              </div>
              <span className="gap-score">
                {g.current}% <ArrowRight size={13} /> {g.target}%
              </span>
              <button className="text-btn no-print" onClick={() => learn(`lesson-${g.id}`)}>
                Learn
                <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>
      {report && (
        <>
          <section className="card">
            <div className="section-title">
              <div>
                <span className="eyebrow">EMPLOYER-STYLE REQUIREMENTS</span>
                <h2>{state.employer.name}</h2>
                <p>{state.employer.description}</p>
              </div>
              <span
                className={`badge ${meetsRequirements(scores, state.employer.requirements) ? 'badge-green' : 'badge-warm'}`}
              >
                {meetsRequirements(scores, state.employer.requirements)
                  ? 'Meets example profile'
                  : 'Requirements still below target'}
              </span>
            </div>
            <SkillTable
              skills={reportSkills}
              scores={scores}
              employer={state.employer.requirements}
            />
          </section>
          <section className="card">
            <h2>Learning modules completed</h2>
            {modules.length ? (
              <div className="tags">
                {modules.map((p) => (
                  <span className="tag" key={p.lessonId}>
                    <Check size={14} />
                    {state.lessons.find((l) => l.id === p.lessonId)?.title}
                  </span>
                ))}
              </div>
            ) : (
              <p>No modules mastered yet. Finish practice checks to record completion.</p>
            )}
            <p className="small muted">
              Practice mastery records lesson performance. Role readiness comes from assessment
              answers.
            </p>
          </section>
        </>
      )}
      <section className="card">
        <h2>What should I do next?</h2>
        <ol>
          {gaps.slice(0, 3).map((g) => (
            <li key={g.id}>
              Repair {g.name.toLowerCase()} from {g.current}% toward its {g.target}% role target;
              verify with an independent transfer task.
            </li>
          ))}
          <li>
            {modules.length
              ? 'Verify mastered modules in a fresh assessment bank.'
              : 'Complete a guided and independent repair task before reassessment.'}
          </li>
          <li>
            Explain one real project decision and its limitations to a peer or placement mentor.
          </li>
        </ol>
        <h3>What this result does not prove</h3>
        <p>
          It does not guarantee interview performance or hiring, prove production-level engineering
          ability, or establish a scientifically validated proficiency score. Limited-evidence
          signals may change with further evidence. Browser coding results are inspectable and may
          be manipulated; deterministic concept matching can miss valid explanations.
        </p>
      </section>
      <section className="card no-print">
        <div className="section-title">
          <h2>
            <ClipboardList size={20} />
            Review your decisions
          </h2>
          <button className="btn btn-outline" disabled={busy} onClick={toggleReview}>
            {showReview ? 'Hide action review' : 'Show action feedback'}
          </button>
        </div>
        {reviewError && <p role="alert">{reviewError}</p>}
        {showReview && (
          <div className="review-list">
            {review.map((r) => (
              <details key={r.questionId}>
                <summary>
                  <span className={`badge ${r.correct ? 'badge-green' : 'badge-warm'}`}>
                    {r.correct ? 'Correct' : 'Gap signal'}
                  </span>
                  {r.prompt}
                </summary>
                <small className="muted">{r.scenario}</small>
                <p>
                  <b>Your choice:</b> {r.selected}
                </p>
                <p>{r.explanation}</p>
              </details>
            ))}
          </div>
        )}
      </section>
      <div className="next-actions card no-print">
        <div>
          <span className="eyebrow">RECOMMENDED NEXT ACTION</span>
          <h2>{gaps.length ? 'Repair a gap, then verify it.' : 'Keep your evidence current.'}</h2>
          <p>
            {gaps.length
              ? 'Start with the first priority. Review mistakes, complete mastery checks, and use new cases to test transfer.'
              : 'Try further applied tasks. Passing this prototype threshold is a starting signal, not proof of employability.'}
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => learn()}>
            Open learning plan
            <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-outline"
            disabled={busy}
            onClick={() => void reassess().catch(() => {})}
          >
            Start reassessment
          </button>
        </div>
      </div>
      <div className="disclaimer">
        {disclaimer} These short structured simulations do not measure every aspect of workplace
        performance.
      </div>
    </>
  );
}
