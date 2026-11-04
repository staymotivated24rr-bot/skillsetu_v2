'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearningAnswer, PublicStep, StudioView } from '@/lib/learning-studio/types';
import type { TaskPayload } from '@/lib/authentic/types';
import { LearningCompanion } from './learning-companion';
import { CodeBlockComposer } from './code-block-composer';
import { DiagnosticOption } from './diagnostic-option';
import { TaskResponse } from './task-response';
import styles from './interactive-lesson-studio.module.css';
import { ReferenceVisual } from './reference-visual';
import { learningAnswerText } from '@/lib/learning-studio/review';
import { lessonNavigation } from '@/lib/learning-studio/lesson-navigation';

type Reply = {
  session?: boolean;
  run?: StudioView | null;
  evaluation?: {
    correct: boolean;
    feedback: string;
    passed?: number;
    total?: number;
    score?: number;
    response?: string;
  };
};
async function request(body?: Record<string, unknown>, lessonId?: string): Promise<Reply> {
  const response = await fetch(
    '/api/diagnostic-v2/learning' +
      (!body && lessonId ? '?lesson=' + encodeURIComponent(lessonId) : ''),
    {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Could not connect.');
  return result;
}
export function InteractiveLessonStudio({
  lessonId = 'studio-positive-batch',
  sourceRunId,
  competencyId,
  learningRunId,
}: {
  lessonId?: string;
  sourceRunId?: string;
  competencyId?: string;
  learningRunId?: string;
}) {
  const course = lessonId !== 'studio-positive-batch';
  const intro = lessonNavigation[lessonId];
  const [run, setRun] = useState<StudioView | null>(null),
    [session, setSession] = useState(false),
    [loading, setLoading] = useState(true);
  const [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(
    () =>
      learningRunId
        ? fetch('/api/diagnostic-v2/learning?run=' + encodeURIComponent(learningRunId), {
            cache: 'no-store',
          }).then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            return { ...data, session: true } as Reply;
          })
        : sourceRunId
          ? request({ action: 'start', lessonId, sourceRunId, competencyId })
          : request(undefined, lessonId),
    [lessonId, sourceRunId, competencyId, learningRunId],
  );
  const reload = useCallback(async () => {
    const data = await load();
    setSession(sourceRunId ? true : !!data.session);
    setRun(data.run ?? null);
  }, [load, sourceRunId]);
  useEffect(() => {
    load()
      .then((data) => {
        setSession(sourceRunId ? true : !!data.session);
        setRun(data.run ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load, sourceRunId]);
  useEffect(() => {
    const active = document.getElementById('studio-step-heading');
    (active ?? heading.current)?.focus();
  }, [run?.currentStepId]);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  }
  async function start(restart = false) {
    await act(async () => {
      if (!session && !sourceRunId) {
        await request({ action: 'enter', name });
        setSession(true);
      }
      const data = await request({ action: 'start', restart, lessonId, sourceRunId, competencyId });
      setRun(data.run!);
    });
  }
  const send = useCallback(async (body: Record<string, unknown>) => {
    const data = await request(body);
    setRun(data.run!);
    return data;
  }, []);
  const index = run?.lesson.steps.findIndex((s) => s.id === run.currentStepId) ?? 0;
  return (
    <div className="product-app">
      <div className={styles.shell} data-active={!!run}>
        <header className={styles.header}>
          <Link href="/">
            SkillSetu <span>THE LEARNING STUDIO</span>
          </Link>
          <LearningCompanion compact />
        </header>
        <main id="main-content" aria-busy={busy}>
          <p className="eyebrow">
            {course
              ? lessonId === 'python-transfer-manifest'
                ? 'PYTHON TRANSFER · INDEPENDENT APPLICATION'
                : 'PYTHON FOUNDATIONS · LEARN BY DOING'
              : 'Development demonstration · guided practice only'}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {run?.lesson.title ??
              (course
                ? (intro?.title ?? 'Interactive Python lesson')
                : 'Interactive Learning Studio')}
          </h1>
          <p className={styles.intro}>{course ? intro?.summary : ''}</p>
          <details className={styles.sessionDetails}>
            <summary>About this learning workspace</summary>
            <p className={styles.sessionNote}>
              This lesson uses your diagnostic browser session. The student demo remains separate.
              Practice never changes diagnostic scores.
            </p>
          </details>
          <p>
            <Link href="/diagnostic-v2/learn/visualizations">
              Explore the Python visualization studio
            </Link>
          </p>
          {sourceRunId && (
            <p>
              <Link href={`/diagnostic-v2?run=${encodeURIComponent(sourceRunId)}`}>
                Return to your source diagnostic report
              </Link>
              . Lesson completion never changes that report.
            </p>
          )}
          {error && (
            <div role="alert" className={styles.error}>
              {error} <button onClick={() => void act(reload)}>Reconnect and resume</button>
              <button
                onClick={() =>
                  void act(async () => {
                    await request({ action: 'leave' });
                    setSession(false);
                    setRun(null);
                  })
                }
              >
                Start a new diagnostic browser session
              </button>
              <p>
                This clears only the diagnostic cookie. Existing saved records and the student demo
                remain separate.
              </p>
            </div>
          )}
          {loading ? (
            <p role="status">Loading saved lesson…</p>
          ) : !run && sourceRunId ? (
            <p>
              Open the source report using its original diagnostic browser session to continue. The
              demo session cannot unlock this lesson.
            </p>
          ) : !run ? (
            <section className={styles.card}>
              <h2>
                {course ? 'Build a reliable mental model of Python' : 'Trace a safe batch total'}
              </h2>
              <p>
                {course
                  ? `${intro?.count ?? ''} focused steps. Explain, explore, predict, practise, apply and verify. Saved as you go.`
                  : 'One short lesson, eight interaction types. This development content awaits educator review.'}
              </p>
              {!session && (
                <label>
                  Your practice name
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
                </label>
              )}
              <button
                className="btn btn-primary"
                disabled={busy || (!session && !name.trim())}
                onClick={() => void start()}
              >
                {course ? 'Begin the lesson' : 'Start demonstration lesson'}
              </button>
            </section>
          ) : (
            <>
              <p>
                Version {run.lesson.version} · Practice run {run.ordinal}
              </p>
              <details>
                <summary>Objectives and prerequisites</summary>
                <ul>
                  {run.lesson.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <p>
                  Foundation to review:{' '}
                  {(run.lesson.prerequisiteLabels ?? run.lesson.prerequisites).join(', ')}. Lesson
                  practice does not assert prerequisite proficiency.
                </p>
              </details>
              <label className={styles.progress}>
                Lesson progress: {run.completed} of {run.lesson.steps.length} steps completed
                <progress max={run.lesson.steps.length} value={run.completed} />
              </label>
              {(run.status === 'completed' || run.mastery?.status === 'needs-practice') && (
                <section role="status" className={styles.complete}>
                  <h2>
                    {run.status === 'completed'
                      ? 'Lesson complete'
                      : 'Keep building your reference model'}
                  </h2>
                  <p>
                    {run.mastery
                      ? 'Your practice responses are saved. Review your reasoning below, or start a new run with a different final check. Lesson mastery is shown separately.'
                      : 'All eight guided checks completed. This records practice completion, not independent mastery or assessment proficiency. Retried and assisted attempts remain recorded.'}
                  </p>
                  <button onClick={() => void start(true)} disabled={busy}>
                    New practice run
                  </button>
                </section>
              )}
              {run.mastery && (
                <details open={run.mastery.status !== 'awaiting-check'}>
                  <summary>Independent practice evidence</summary>
                  <section className={styles.mastery} aria-label="Lesson mastery result">
                    <span className="eyebrow">LESSON MASTERY · SEPARATE FROM ASSESSMENT</span>
                    <h2>
                      {run.mastery.status === 'mastered'
                        ? 'Lesson mastery demonstrated'
                        : run.mastery.status === 'needs-practice'
                          ? 'More independent practice needed'
                          : 'Your independent check is ahead'}
                    </h2>
                    <p>
                      {run.mastery.independentCorrect} / {run.mastery.total} checkpoint
                      {run.mastery.total === 1 ? '' : 's'} correct on first unaided attempts ·{' '}
                      {run.mastery.required} required. Final check:{' '}
                      {run.mastery.finalPassed
                        ? 'first attempt passed'
                        : run.mastery.status === 'awaiting-check'
                          ? 'not attempted yet'
                          : 'first attempt needs practice'}
                      .
                    </p>
                    <p>
                      {run.mastery.status === 'awaiting-check'
                        ? 'Hints and retries help you learn. Only first unaided responses count toward lesson mastery.'
                        : run.mastery.reason}
                    </p>
                  </section>
                </details>
              )}
              <details className={styles.lessonMap} open={!course}>
                <summary>
                  Lesson map · step {index + 1} of {run.lesson.steps.length}
                </summary>
                <nav aria-label="Lesson steps" className={styles.steps}>
                  {run.lesson.steps.map((s, i) => (
                    <button
                      key={s.id}
                      disabled={busy || i > run.unlocked}
                      aria-current={index === i ? 'step' : undefined}
                      onClick={() =>
                        void act(async () => {
                          await send({
                            action: 'visit',
                            runId: run.id,
                            stepId: s.id,
                            requestId: crypto.randomUUID(),
                          });
                        })
                      }
                    >
                      {i + 1}. {s.title}
                    </button>
                  ))}
                </nav>
              </details>
              <LessonStep
                key={run.id + run.currentStepId}
                run={run}
                step={run.lesson.steps[index]}
                send={send}
              />
              <div className={styles.navigation}>
                {[-1, 1].map((delta) => (
                  <button
                    key={delta}
                    disabled={
                      busy ||
                      index + delta < 0 ||
                      index + delta > run.unlocked ||
                      index + delta >= run.lesson.steps.length
                    }
                    onClick={() =>
                      void act(async () => {
                        await send({
                          action: 'visit',
                          runId: run.id,
                          stepId: run.lesson.steps[index + delta].id,
                          requestId: crypto.randomUUID(),
                        });
                      })
                    }
                  >
                    {delta < 0 ? 'Previous' : 'Next'}
                  </button>
                ))}
              </div>
              {course && (
                <details open={run.status === 'completed'}>
                  <summary>Review saved learning attempts</summary>
                  <section className={styles.reviewPanel} aria-label="Learning review">
                    <h2>Your learning review</h2>
                    <p>
                      Your first attempts stay recorded. Later success shows learning; it does not
                      rewrite earlier evidence.
                    </p>
                    {run.results
                      .filter((r) => r.first)
                      .map((first) => {
                        const step = run.lesson.steps.find((s) => s.id === first.stepId)!;
                        const latest = run.results.filter((r) => r.stepId === first.stepId).at(-1)!;
                        return (
                          <details key={first.stepId}>
                            <summary>
                              {step.title} ·{' '}
                              {step.kind === 'explanation'
                                ? 'reviewed'
                                : first.correct
                                  ? 'first attempt correct'
                                  : 'first attempt missed'}
                              {first.assisted ? ' · guided or hinted' : ''}
                            </summary>
                            <p>
                              First response: <code>{learningAnswerText(step, first.answer)}</code>
                            </p>
                            <p>{first.feedback}</p>
                            {latest.attempt > 1 && (
                              <p>
                                Latest attempt {latest.attempt}:{' '}
                                {latest.correct ? 'correct' : 'not correct yet'}. {latest.feedback}
                              </p>
                            )}
                          </details>
                        );
                      })}
                  </section>
                </details>
              )}
            </>
          )}
          <p>
            <Link href="/diagnostic-v2">Return to Python Diagnostic v2</Link>
          </p>
        </main>
      </div>
    </div>
  );
}

function LessonStep({
  run,
  step,
  send,
}: {
  run: StudioView;
  step: PublicStep;
  send: (body: Record<string, unknown>) => Promise<Reply>;
}) {
  const latest = run.results.filter((r) => r.stepId === step.id).at(-1);
  const initial =
    run.drafts[step.id] ??
    (step.kind === 'ordering' ? { order: step.items!.map((s) => s.id) } : {});
  const [answer, setAnswer] = useState<LearningAnswer>(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saveState, setSaveState] = useState('');
  const revision = useRef(run.draftRevision),
    saved = useRef(JSON.stringify(initial)),
    pending = useRef<{ hash: string; id: string } | null>(null),
    queue = useRef<Promise<unknown>>(Promise.resolve());
  const disabled = busy || run.status === 'completed';
  // A shared per-step queue prevents our own draft/submit requests overtaking each other.
  const action = useCallback(
    (body: Record<string, unknown>) => {
      const next = queue.current
        .catch(() => {})
        .then(async () => {
          const result = await send({
            ...body,
            runId: run.id,
            stepId: step.id,
            ...(body.action === 'draft' ? { revision: revision.current } : {}),
          });
          revision.current = result.run!.draftRevision;
          return result;
        });
      queue.current = next;
      return next;
    },
    [send, run.id, step.id],
  );
  useEffect(() => {
    const serialized = JSON.stringify(answer);
    if (disabled || serialized === saved.current) return;
    const timer = setTimeout(() => {
      action({ action: 'draft', answer, requestId: crypto.randomUUID() })
        .then(() => {
          saved.current = serialized;
          setSaveState('Draft saved.');
        })
        .catch((e) => {
          setSaveState('Draft not saved. Reconnect before continuing.');
          setError(e.message);
        });
    }, 650);
    return () => clearTimeout(timer);
  }, [answer, disabled, action]);
  const codeDraft = useCallback((execution: TaskPayload) => setAnswer({ execution }), []);
  async function submit(value = answer) {
    setBusy(true);
    setError('');
    const hash = JSON.stringify(value);
    if (!pending.current || pending.current.hash !== hash)
      pending.current = { hash, id: crypto.randomUUID() };
    try {
      await action({ action: 'submit', answer: value, requestId: pending.current.id });
      saved.current = hash;
      pending.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.card} aria-label={step.accessibility.label}>
      <p className="eyebrow">{step.kind.replaceAll('-', ' ')}</p>
      <h2 id="studio-step-heading" tabIndex={-1}>
        {step.title}
      </h2>
      <p className={styles.phase}>
        {step.phase ??
          {
            explanation: 'Explain',
            prediction: 'Predict',
            reasoning: 'Practice',
            numeric: 'Predict',
            blocks: 'Apply',
            ordering: 'Practice',
            trace: 'Practice',
            mastery: 'Verify',
            execution: 'Apply',
          }[step.kind]}
      </p>
      <p>{step.instruction}</p>
      <p className="muted">{step.objective}</p>
      {step.independent && (
        <p className={styles.checkpoint}>
          {step.kind === 'mastery'
            ? `FINAL INDEPENDENT CHECK · ${step.cells?.length ?? 0} predictions, submitted together`
            : 'RETRIEVAL CHECK · try it without a hint first'}
        </p>
      )}
      {step.referenceFrames && (
        <ReferenceVisual
          frames={step.referenceFrames}
          index={Math.min(answer.frame ?? 0, step.referenceFrames.length - 1)}
          onChange={(frame) => setAnswer({ ...answer, frame })}
        />
      )}
      {step.visual && (
        <div className={styles.visual} role="group" aria-label={step.visual.label}>
          {step.visual.cards.map((c) => (
            <div key={c.label}>
              <b>{c.label}</b>
              <code>{c.value}</code>
            </div>
          ))}
        </div>
      )}
      {step.code && step.kind !== 'blocks' && (
        <pre className={styles.code}>
          <code>{step.code}</code>
        </pre>
      )}
      {step.kind === 'explanation' ? (
        <label>
          <input
            type="checkbox"
            checked={answer.acknowledged ?? false}
            disabled={disabled}
            onChange={(e) => setAnswer({ ...answer, acknowledged: e.target.checked })}
          />{' '}
          I have reviewed the concept
        </label>
      ) : step.kind === 'reasoning' ? (
        <fieldset>
          <legend>Choose one reason</legend>
          {step.options!.map((o, i) => (
            <label className={styles.option} key={o}>
              <input
                type="radio"
                name={step.id}
                checked={answer.selected === i}
                disabled={disabled}
                onChange={() => setAnswer({ selected: i })}
              />
              <DiagnosticOption text={o} />
            </label>
          ))}
        </fieldset>
      ) : step.kind === 'blocks' ? (
        <>
          <p className={styles.codeHelp}>
            On narrow screens, scroll inside the code panel. Use the labeled blanks or Next blank to
            choose each block.
          </p>
          <CodeBlockComposer
            question={{
              id: step.id,
              code: step.code
                ?.split('___')
                .map(
                  (part, i, parts) =>
                    part +
                    (i < parts.length - 1 && step.slots?.[i] ? `{{${step.slots[i].id}}}` : ''),
                )
                .join(''),
              codeSlots: step.slots,
            }}
            answer={{ blocks: answer.blocks }}
            onChange={setAnswer}
            disabled={disabled}
            instruction="Choose a block, then check your answer. Learning feedback appears after each attempt."
          />
        </>
      ) : step.kind === 'ordering' ? (
        <ol className={styles.order}>
          {(answer.order ?? []).map((id, i) => (
            <li key={id}>
              <span>{step.items!.find((s) => s.id === id)?.text}</span>
              {[-1, 1].map((d) => (
                <button
                  key={d}
                  aria-label={`Move operation ${i + 1} ${d < 0 ? 'up' : 'down'}`}
                  disabled={disabled || i + d < 0 || i + d >= step.items!.length}
                  onClick={() => {
                    const order = [...answer.order!];
                    [order[i], order[i + d]] = [order[i + d], order[i]];
                    setAnswer({ order });
                  }}
                >
                  {d < 0 ? '↑' : '↓'}
                </button>
              ))}
            </li>
          ))}
        </ol>
      ) : step.kind === 'trace' || step.kind === 'mastery' ? (
        <fieldset>
          <legend>
            {step.kind === 'mastery'
              ? 'Your final predictions'
              : 'Variable states after each input'}
          </legend>
          <div className={styles.trace}>
            {step.cells!.map((c) => (
              <label key={c.id}>
                {c.label}
                <input
                  inputMode={
                    c.format === 'literal' || c.format === 'plain'
                      ? 'text'
                      : c.format === 'float'
                        ? 'decimal'
                        : 'numeric'
                  }
                  maxLength={100}
                  aria-describedby={error ? `${step.id}-error` : undefined}
                  aria-invalid={!!error && error.startsWith(c.label + ':')}
                  value={answer.state?.[c.id] ?? ''}
                  disabled={disabled}
                  onChange={(e) =>
                    setAnswer({ state: { ...answer.state, [c.id]: e.target.value } })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : step.kind === 'execution' ? (
        <TaskResponse
          task={step.task!}
          storageKey={`${run.status === 'completed' ? 'studio-review' : 'studio'}:${run.id}:${step.id}`}
          initial={answer.execution}
          busy={disabled}
          onDraft={codeDraft}
          evaluate={async (execution) => {
            const data = await action({
              action: 'evaluate',
              answer: { execution },
              requestId: crypto.randomUUID(),
            });
            return data.evaluation!;
          }}
          onSubmit={(execution) => submit({ execution })}
        />
      ) : (
        <label>
          {step.kind === 'numeric'
            ? `Your answer (float, exactly ${step.numeric!.places} decimal ${step.numeric!.places === 1 ? 'place' : 'places'})`
            : step.responseFormat === 'literal'
              ? 'Predicted output (Python literal)'
              : step.responseFormat === 'plain'
                ? 'Predicted output (text, no quotes)'
                : 'Predicted output (integer)'}
          <input
            value={answer.text ?? ''}
            disabled={disabled}
            inputMode={
              step.kind === 'numeric'
                ? 'decimal'
                : step.responseFormat && step.responseFormat !== 'integer'
                  ? 'text'
                  : 'numeric'
            }
            maxLength={1000}
            onChange={(e) => setAnswer({ text: e.target.value })}
            aria-describedby={error ? `${step.id}-error` : undefined}
            aria-invalid={!!error}
          />
        </label>
      )}
      {error && (
        <p id={`${step.id}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <p role="status">{saveState}</p>
      {step.kind !== 'execution' && (
        <button className="btn btn-primary" disabled={disabled} onClick={() => void submit()}>
          {latest ? 'Check again' : 'Check answer'}
        </button>
      )}
      {step.kind !== 'mastery' && (
        <button
          className="btn btn-outline"
          disabled={disabled}
          onClick={() => {
            setBusy(true);
            setError('');
            void action({ action: 'hint', requestId: crypto.randomUUID() })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          Need a hint?
        </button>
      )}
      {run.hints[step.id] && (
        <p role="status" className={styles.feedback}>
          {run.hints[step.id]}
        </p>
      )}
      {latest && (
        <div role="status" className={styles.feedback}>
          <b>
            {step.kind === 'explanation'
              ? 'Concept reviewed'
              : latest.correct
                ? 'Correct'
                : 'Not correct yet'}
          </b>
          <p>{latest.feedback}</p>
          <small>
            Attempt {latest.attempt}.{' '}
            {step.independent
              ? 'The first unaided response is preserved for lesson mastery.'
              : 'Guided practice only.'}{' '}
            You can retry for learning.
          </small>
        </div>
      )}
    </section>
  );
}
