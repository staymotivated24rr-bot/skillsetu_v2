'use client';
import { useState } from 'react';
import type { DemoState, AttemptView } from '@/lib/types';
import type { TaskPayload } from '@/lib/authentic/types';
import { TaskResponse } from './task-response';
import { Meter } from './ui';
export function AuthenticSimulation({
  state,
  attempt,
  busy,
  submit,
  evaluate,
  finish,
}: {
  state: DemoState;
  attempt: AttemptView;
  busy: boolean;
  submit: (taskId: string, payload: TaskPayload) => Promise<void>;
  evaluate: (
    taskId: string,
    payload: TaskPayload,
  ) => Promise<{ passed?: number; total?: number; score?: number; response?: string }>;
  finish: () => Promise<void>;
}) {
  const bank = attempt.bank!;
  const evidence = attempt.evidence ?? [];
  const [followup, setFollowup] = useState(false);
  const done = evidence.length === bank.tasks.length;
  const task = bank.tasks[Math.min(evidence.length - (followup ? 1 : 0), bank.tasks.length - 1)];
  const scenario = bank.scenarios.find((s) => s.id === task.scenario)!;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            PYTHON DEVELOPER ·{' '}
            {attempt.kind === 'diagnostic' ? 'WORKPLACE DIAGNOSTIC' : 'FRESH REASSESSMENT'}
          </span>
          <h1>Show how you work.</h1>
          <p>
            {bank.title} · {bank.version} · Progress saved after every submitted response.
          </p>
        </div>
        <span className="badge">
          {evidence.length} / {bank.tasks.length} evidence opportunities
        </span>
      </div>
      <Meter value={(100 * evidence.length) / bank.tasks.length} label="Assessment completion" />
      <div className="simulation-layout authentic-layout">
        <aside className="card case-panel">
          <span className="eyebrow">{scenario.company}</span>
          <h2>{scenario.title}</h2>
          <div className="stakeholder">
            <div className="avatar">
              {scenario.stakeholder
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <b>{scenario.stakeholder}</b>
              <small>{scenario.stakeholderRole}</small>
            </div>
          </div>
          <blockquote>{scenario.brief}</blockquote>
          <p className="small">
            About {bank.tasks.slice(evidence.length).reduce((n, t) => n + t.minutes, 0)} minutes
            remaining. No assessment timer.
          </p>
          <div className="case-list">
            {bank.scenarios.map((s, i) => (
              <div key={s.id} className={s.id === scenario.id ? 'active' : ''}>
                {i + 1}. {s.title}
              </div>
            ))}
          </div>
          <details className="case-conversation">
            <summary>Workplace conversation · {evidence.length} responses</summary>
            {evidence.slice(-8).map((e) => (
              <div key={e.taskId}>
                <small>{bank.tasks.find((t) => t.id === e.taskId)?.title}</small>
                <p>{e.response}</p>
              </div>
            ))}
          </details>
        </aside>
        <section className="card action-panel">
          {followup ? (
            <div className="stakeholder-followup">
              <span className="eyebrow">STAKEHOLDER RESPONSE</span>
              <h2>New evidence for the next decision.</h2>
              <p>{evidence.at(-1)?.response}</p>
              <button className="btn btn-primary" onClick={() => setFollowup(false)}>
                Continue workplace task
              </button>
            </div>
          ) : done ? (
            <>
              <span className="eyebrow">EVIDENCE SAVED</span>
              <h2>Your work is ready to review.</h2>
              <p>
                Submit to calculate skill-specific evidence scores and a prioritized repair plan.
              </p>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void finish().catch(() => {})}
              >
                Submit assessment
              </button>
            </>
          ) : (
            <>
              <div className="action-heading">
                <span className="badge">{task.type.replaceAll('-', ' ')}</span>
                {task.transfer && <span className="badge badge-green">Transfer evidence</span>}
                <span>
                  {evidence.length + 1} / {bank.tasks.length}
                </span>
              </div>
              <h2>{task.title}</h2>
              <p>{task.context}</p>
              {task.revealedConstraint && (
                <div className="revealed-constraint" role="status">
                  {task.revealedConstraint}
                </div>
              )}
              <h3>{task.prompt}</h3>
              <TaskResponse
                key={task.id}
                task={task}
                storageKey={`skillsetu-${state.user.id}-${attempt.id}-${task.id}`}
                busy={busy}
                evaluate={(p) => evaluate(task.id, p)}
                onSubmit={async (p) => {
                  await submit(task.id, p);
                  setFollowup(true);
                }}
              />
            </>
          )}
        </section>
      </div>
      <p className="footnote">
        Submitted task credit is mapped to individual skills by authored weights; readiness is their
        role-importance-weighted average. Practice never changes this evidence. Browser code
        execution is inspectable prototype evidence.
      </p>
    </>
  );
}
