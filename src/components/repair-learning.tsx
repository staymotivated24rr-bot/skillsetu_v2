'use client';
import { useState } from 'react';
import type { DemoState } from '@/lib/types';
import type { TaskPayload } from '@/lib/authentic/types';
import { planGaps } from '@/lib/engine';
import { repairPlan } from '@/lib/authentic/planning';
import { TaskResponse } from './task-response';
import { Empty, Meter } from './ui';
export function RepairLearning({
  state,
  selected,
  busy,
  open,
  send,
  reassess,
}: {
  state: DemoState;
  selected: string | null;
  busy: boolean;
  open: (skillId: string, mode: 'structured' | 'interactive', restart?: boolean) => Promise<void>;
  send: (
    skillId: string,
    taskId: string,
    payload?: TaskPayload,
    evaluate?: boolean,
  ) => Promise<{
    score?: number;
    passed?: number;
    total?: number;
    response?: string;
    hint?: string;
    explanation?: string;
  }>;
  reassess: () => Promise<void>;
}) {
  const latest = state.attempts.filter((a) => a.status === 'complete').at(-1);
  const progress = state.repairProgress?.find((p) => p.skillId === selected);
  const [step, setStep] = useState<number | null>(null);
  const [hint, setHint] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showAll, setShowAll] = useState(false);
  if (!latest)
    return (
      <Empty
        title="First, find your gaps."
        text="Complete the workplace diagnostic to build a plan from assessed evidence."
      />
    );
  if (progress) {
    const repair = progress.module;
    const first = progress.answers.filter((a) => a.first);
    const index = step ?? first.length;
    const task = repair.tasks[index];
    const complete = index >= repair.tasks.length;
    return (
      <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">PYTHON · TARGETED REPAIR</span>
            <h1>{repair.title}</h1>
            <p>
              Practice mastery stays separate from assessed proficiency. Your diagnostic score is
              unchanged.
            </p>
          </div>
          <span className="badge">
            {repair.minutes} minutes · {repair.version}
          </span>
        </div>
        <div className="lesson-layout">
          <aside className="card lesson-guide">
            <h2>Repair the principle.</h2>
            <div className="mode-switch">
              {(['interactive', 'structured'] as const).map((mode) => (
                <button
                  key={mode}
                  className={progress.mode === mode ? 'active' : ''}
                  disabled={busy}
                  onClick={() => void open(repair.skillId, mode)}
                >
                  {mode === 'interactive' ? 'Interactive' : 'Structured'}
                </button>
              ))}
            </div>
            <ol className="lesson-steps">
              {repair.tasks.map((t, i) => (
                <li key={t.id}>
                  <button
                    disabled={i > first.length || busy}
                    className={index === i ? 'active' : ''}
                    onClick={() => {
                      setStep(i);
                      setHint('');
                      setFeedback('');
                    }}
                  >
                    {i + 1}. {t.title}
                  </button>
                </li>
              ))}
            </ol>
            <Meter value={(100 * first.length) / repair.tasks.length} label="Repair completion" />
            <p className="small muted">
              Mastery requires at least 5 of 6 strong first responses, including the transfer
              challenge. Retries teach; a new run can verify improvement.
            </p>
          </aside>
          <section className="card lesson-work">
            {(progress.mode === 'structured' || complete) && (
              <div className="concept-content">
                <span className="eyebrow">CONCEPT REPAIR</span>
                <h2>{repair.title}</h2>
                <p>{repair.concept}</p>
                <div className="intuition">
                  <b>Intuition</b>
                  <p>{repair.intuition}</p>
                </div>
                <div className="worked-example">
                  <h3>Worked example</h3>
                  <p>{repair.example}</p>
                </div>
              </div>
            )}
            {complete ? (
              <>
                <h2>
                  {progress.status === 'mastered'
                    ? 'You demonstrated this lesson’s objectives.'
                    : 'A little more practice will help.'}
                </h2>
                <p>
                  {first.filter((a) => a.score >= 0.75).length} / 6 strong first responses. Your
                  assessment readiness remains {latest.score}% until new reassessment evidence
                  exists.
                </p>
                <div className="actions">
                  <button className="btn btn-primary" onClick={() => void reassess()}>
                    Verify in a fresh case
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={async () => {
                      await open(
                        repair.skillId,
                        progress.mode as 'structured' | 'interactive',
                        true,
                      );
                      setStep(null);
                      setHint('');
                      setFeedback('');
                    }}
                  >
                    New practice run
                  </button>
                </div>
                <h3>Interview-style reflection</h3>
                <p>{repair.interview}</p>
              </>
            ) : (
              <>
                <span className="badge">{task.transfer ? 'Transfer challenge' : task.title}</span>
                <h2>{task.prompt}</h2>
                <p>{task.context}</p>
                <button
                  className="text-btn"
                  disabled={busy}
                  onClick={async () => {
                    const result = await send(repair.skillId, task.id);
                    setHint(result.hint ?? '');
                  }}
                >
                  Need a hint?
                </button>
                {hint && (
                  <div className="hint" role="status">
                    {hint}
                  </div>
                )}
                <TaskResponse
                  key={task.id + '-' + progress.run}
                  task={task}
                  storageKey={`skillsetu-repair-${state.user.id}-${repair.id}-${progress.run}-${task.id}`}
                  initial={progress.answers.filter((a) => a.taskId === task.id).at(-1)?.payload}
                  busy={busy}
                  evaluate={(p) => send(repair.skillId, task.id, p, true)}
                  onSubmit={async (p) => {
                    const result = await send(repair.skillId, task.id, p);
                    setFeedback(
                      `${Math.round((result.score ?? 0) * 100)}% rubric credit. ${result.explanation ?? ''}`,
                    );
                    setStep(index);
                  }}
                />
                {(feedback || first.some((a) => a.taskId === task.id)) && (
                  <div className="feedback">
                    <p role="status">
                      {feedback ||
                        progress.answers.filter((a) => a.taskId === task.id).at(-1)?.response}
                    </p>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setStep(index + 1);
                        setFeedback('');
                        setHint('');
                      }}
                    >
                      Next practice task
                    </button>
                    <p className="small">
                      You may retry this response before continuing. The first response remains
                      recorded honestly.
                    </p>
                  </div>
                )}
                {progress.mode === 'interactive' && (
                  <details className="concept-toggle">
                    <summary>Show concept and worked example</summary>
                    <p>{repair.concept}</p>
                    <p>{repair.intuition}</p>
                    <p>{repair.example}</p>
                  </details>
                )}
              </>
            )}
          </section>
        </div>
      </>
    );
  }
  const skills = latest.skillSnapshot ?? state.skills;
  const gaps = planGaps(latest.scores, skills);
  const mastered =
    state.repairProgress?.filter((p) => p.status === 'mastered').map((p) => p.skillId) ?? [];
  const days = repairPlan(latest.scores, skills, state.repairs ?? [], mastered);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR PRIORITIZED ROADMAP</span>
          <h1>Repair the next important gap.</h1>
          <p>
            Evidence, prerequisites and effort determine the plan. Completing it does not guarantee
            employment.
          </p>
        </div>
        <span className="badge">{mastered.length} modules mastered</span>
      </div>
      <section className="card seven-day-plan">
        <div className="section-title">
          <h2>Your 7-day repair plan</h2>
          <span className="small muted">A suggested pace, not a deadline</span>
        </div>
        <div className="day-grid">
          {days.map((day) => (
            <article key={day.day}>
              <span className="eyebrow">DAY {day.day}</span>
              <h3>
                {day.skills.length
                  ? day.skills.map((id) => skills.find((s) => s.id === id)?.name).join(' · ')
                  : day.day === 7
                    ? 'Verify transfer'
                    : 'Review and consolidate'}
              </h3>
              <p>{day.action}</p>
              <small>
                {day.minutes ? `${day.minutes} minutes estimated` : '20–30 minutes suggested'}
              </small>
            </article>
          ))}
        </div>
      </section>
      <div className="section-title">
        <h2>{showAll ? 'All modules' : 'Your prioritized plan'}</h2>
        <button className="text-btn" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show only gaps' : 'Browse all modules'}
        </button>
      </div>
      <div className="repair-roadmap">
        {(showAll ? skills : gaps).map((skill, i) => {
          const repair = state.repairs?.find((m) => m.skillId === skill.id);
          const score = latest.scores.find((s) => s.skillId === skill.id);
          const gap = gaps.find((g) => g.id === skill.id);
          if (!repair) return null;
          const struggles = (latest.evidence ?? [])
            .filter(
              (e) =>
                e.score < 0.75 &&
                latest.bank?.tasks
                  .find((t) => t.id === e.taskId)
                  ?.skillIds.some((m) => m.skillId === skill.id),
            )
            .slice(0, 2)
            .map((e) => {
              const task = latest.bank!.tasks.find((t) => t.id === e.taskId)!;
              return `${task.type.replaceAll('-', ' ')} in ${latest.bank!.scenarios.find((s) => s.id === e.scenario)?.title}: ${Math.round(e.score * 100)}% credit`;
            });
          return (
            <article className="card repair-priority" key={skill.id}>
              <span className="priority-number">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <span className="eyebrow">
                  {i === 0 ? 'PRIORITY #1' : 'TARGETED REPAIR'} ·{' '}
                  {mastered.includes(skill.id) ? 'MASTERED — VERIFY NEXT' : 'TO PRACTICE'}
                </span>
                <h2>{skill.name}</h2>
                <div className="tags">
                  <span className="tag">
                    {score?.score ?? 0}% evidence score → {skill.target}% target
                  </span>
                  <span className="tag">{score?.quality?.strength ?? 'Limited evidence'}</span>
                  <span className="tag">{repair.minutes} min</span>
                </div>
                <p>
                  <b>Why it matters:</b> {skill.description}
                </p>
                <p>
                  <b>What to repair:</b>{' '}
                  {gap
                    ? `Your submitted responses left a ${gap.gap}-point gap. ${gap.reason}`
                    : 'Current role target met; practise only if you need stronger evidence.'}
                </p>
                {struggles.length > 0 && (
                  <p>
                    <b>Observed difficulty:</b> {struggles.join('; ')}.
                  </p>
                )}
                <p>
                  <b>Prerequisites:</b>{' '}
                  {skill.prerequisites
                    .map((id) => skills.find((s) => s.id === id)?.name)
                    .join(', ') || 'No unmet foundation needed.'}
                </p>
                <p>
                  <b>Next lesson and practice:</b> {repair.title} → guided, independent and harder
                  problems → mini workplace task → transfer challenge.
                </p>
                <details>
                  <summary>Interview and project practice</summary>
                  <p>{repair.interview}</p>
                  <p>{repair.workplace}</p>
                </details>
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => {
                    setStep(null);
                    setHint('');
                    setFeedback('');
                    void open(skill.id, 'interactive');
                  }}
                >
                  Start learning
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <button className="btn btn-outline" disabled={busy} onClick={() => void reassess()}>
        Verify with new cases
      </button>
    </>
  );
}
