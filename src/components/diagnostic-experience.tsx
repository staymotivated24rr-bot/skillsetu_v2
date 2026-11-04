'use client';
import { DiagnosticLearningPathway } from './diagnostic-learning-pathway';
import { AdaptiveLearningRecommendation } from './adaptive-learning-recommendation';
import { DiagnosticScore, DiagnosticQuestionReview } from './diagnostic-question-review';
import { DiagnosticOption } from './diagnostic-option';
import { numericFormatError } from '@/lib/diagnostic/numeric';
import { optionPresentation } from '@/lib/diagnostic/option-presentation';
import { CodeBlockComposer } from './code-block-composer';
import { LearningCompanion } from './learning-companion';
import { DiagnosticManipulation } from './diagnostic-manipulation';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Compass,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Answer, RunView } from '@/lib/diagnostic/types';
import {
  diagnosticPresentations,
  areaCountLabel,
  countLabel,
  diagnosticSentence,
} from '@/lib/diagnostic/presentation';
import styles from './diagnostic.module.css';
type Phase = 'LOADING' | 'INTRO' | 'RESUME' | 'QUESTION' | 'COMPLETED';
async function request(
  body?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ session?: boolean; run?: RunView | null }> {
  const response = await fetch(
    '/api/diagnostic-v2' + (!body && typeof window !== 'undefined' ? window.location.search : ''),
    {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ?? AbortSignal.timeout(20000),
      cache: 'no-store',
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not connect. Please retry.');
  return data;
}
export function DiagnosticExperience({
  draftPreview = false,
  learningEnabled = false,
}: {
  draftPreview?: boolean;
  learningEnabled?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('LOADING'),
    [run, setRun] = useState<RunView | null>(null);
  const [session, setSession] = useState(false),
    [name, setName] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    request(undefined, controller.signal)
      .then((data) => {
        setSession(!!data.session);
        setRun(data.run ?? null);
        setPhase(data.run ? (data.run.status === 'completed' ? 'COMPLETED' : 'RESUME') : 'INTRO');
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setPhase('INTRO');
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [phase, run?.current?.id]);
  async function act(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed. Retry when connected.');
    } finally {
      setBusy(false);
    }
  }
  async function start(restart = false, mode: 'independent' | 'prior-informed' = 'independent') {
    await act(async () => {
      if (!session) {
        await request({ action: 'enter', name: name.trim() });
        setSession(true);
      }
      const data = await request({
        action: 'start',
        mode,
        restart,
        preview: draftPreview,
        ...(restart && run ? { restartFrom: run.id } : {}),
      });
      window.history.replaceState(
        null,
        '',
        '/diagnostic-v2' + (draftPreview ? '?preview=starter-v3' : '?preview=legacy'),
      );
      setRun(data.run!);
      setPhase(data.run!.status === 'completed' ? 'COMPLETED' : 'QUESTION');
    });
  }
  const current = run?.current;
  const selectedDefinition = diagnosticPresentations[draftPreview ? 'starter' : 'legacy'];
  const competencyNames = run
    ? run.competencies.map((c) => c.name)
    : selectedDefinition.competencies;
  const currentIsDraft = run ? run.bankId.startsWith('python-starter-v3-360-') : draftPreview;
  return (
    <div className={styles.shell} data-phase={phase}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark}>S</span> SkillSetu
          <span className={styles.lab}>THE LEARNING STUDIO</span>
        </Link>
        <span className={styles.pilot}>
          <Code2 size={15} /> Python discovery
        </span>
      </header>
      <main className={styles.main} id="diagnostic-main" aria-busy={busy}>
        {currentIsDraft && (
          <p role="status">
            Development preview · 360 draft questions · eight competencies · expert approval and
            pilot validation pending. Results are preliminary.
          </p>
        )}
        {error && (
          <div role="alert" className={styles.error}>
            {error}
            <button
              onClick={() =>
                void act(async () => {
                  const data = await request();
                  setSession(!!data.session);
                  setRun(data.run ?? null);
                  setPhase(
                    data.run ? (data.run.status === 'completed' ? 'COMPLETED' : 'RESUME') : 'INTRO',
                  );
                })
              }
              disabled={busy}
            >
              Reconnect & resume
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await request({ action: 'leave' });
                  setSession(false);
                  setRun(null);
                  setPhase('INTRO');
                  window.history.replaceState(null, '', '/diagnostic-v2');
                })
              }
            >
              Start a new browser session
            </button>
          </div>
        )}
        {phase === 'LOADING' && <p role="status">Finding your saved progress…</p>}
        {(phase === 'INTRO' || phase === 'RESUME') && (
          <div className={styles.intro}>
            <section>
              <p className={styles.eyebrow}>
                <Compass size={16} /> A clearer next step
              </p>
              <h1 ref={heading} tabIndex={-1}>
                Discover what
                <br />
                you can <em>really do.</em>
              </h1>
              <p className={styles.lead}>
                Trace a little code. Repair a boundary. Plan a safer change. Build a picture of your
                Python skills, one decision at a time.
              </p>
              <div className={styles.facts}>
                <span>
                  <b>
                    {run?.minimum ?? selectedDefinition.minimum}–
                    {run?.maximum ?? selectedDefinition.maximum}
                  </b>{' '}
                  adaptive tasks
                </span>
                <span>
                  <b>{competencyNames.length}</b> core competencies
                </span>
                <span>
                  <b>Your pace</b> saved as you go
                </span>
              </div>
              <p>
                Different answers lead to different questions. When the evidence is unclear, your
                report will say so.
              </p>
              {phase === 'RESUME' && run ? (
                <div className={styles.entry}>
                  <b>Your progress is waiting.</b>
                  <p>{countLabel(run.answered, 'answer')} saved · next task ready</p>
                  {run.competencies.length !== selectedDefinition.competencies.length && (
                    <p>
                      This saved attempt keeps its original {run.competencies.length} competencies.
                      A new diagnostic uses {selectedDefinition.competencies.length} competencies.
                    </p>
                  )}
                  <button className={styles.primary} onClick={() => setPhase('QUESTION')}>
                    Resume diagnostic <ArrowRight size={18} />
                  </button>
                  <Link
                    href={`/diagnostic-v2?run=${run.id}${draftPreview ? '&preview=starter-v3' : '&preview=legacy'}`}
                  >
                    Bookmark this saved attempt
                  </Link>
                  <button className={styles.quiet} disabled={busy} onClick={() => void start(true)}>
                    Start a new diagnostic (keep this attempt)
                  </button>
                </div>
              ) : (
                <form
                  className={styles.entry}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void start();
                  }}
                >
                  {!session && (
                    <>
                      <label htmlFor="pilot-name">What should we call you?</label>
                      <input
                        id="pilot-name"
                        autoComplete="nickname"
                        maxLength={40}
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your nickname"
                      />
                    </>
                  )}
                  <button className={styles.primary} disabled={busy || (!session && !name.trim())}>
                    {busy ? 'Preparing your first task…' : 'Explore my Python skills'}{' '}
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}
              <p className={styles.note}>
                <ShieldCheck size={16} /> Private to this browser session. A preliminary learning
                diagnostic, with no hiring score. Keep this browser’s cookies to resume.
              </p>
            </section>
            <aside
              className={styles.pathCard}
              aria-label={`${areaCountLabel(competencyNames.length).replace(/^./, (c) => c.toUpperCase())} competencies explored in this diagnostic`}
            >
              <div className={styles.companionWelcome}>
                <LearningCompanion />
                <p>Meet Orbit, your study companion.</p>
              </div>
              <p className={styles.eyebrow}>Your discovery map</p>
              <h2>
                Small tasks.
                <br />
                Useful signals.
              </h2>
              {competencyNames.map((label, i) => (
                <div className={styles.pathNode} data-current={i === 0} key={label}>
                  <span>
                    {i === 0 ? (
                      <Code2 size={22} />
                    ) : i === 1 ? (
                      <Compass size={22} />
                    ) : i === 2 ? (
                      <Sparkles size={22} />
                    ) : i === 3 ? (
                      <ShieldCheck size={22} />
                    ) : i === 4 ? (
                      <Check size={22} />
                    ) : (
                      <Lightbulb size={22} />
                    )}
                  </span>
                  <div>
                    <b>{label}</b>
                    <small>
                      {i === 0 ? 'Start with one concrete input' : 'Explore through applied tasks'}
                    </small>
                  </div>
                </div>
              ))}
              <p className={styles.note}>About 30–45 minutes. Take breaks whenever you need.</p>
            </aside>
          </div>
        )}
        {phase === 'QUESTION' && run && (
          <>
            <div className={styles.sessionBar}>
              <span>
                Python Developer <span className={styles.separator}>/</span> Skill discovery
              </span>
              <span>
                {run.answered} answered · up to {run.maximum}
              </span>
            </div>
            <progress
              className={styles.progress}
              value={run.answered}
              max={run.maximum}
              aria-label={`${countLabel(run.answered, 'answer')} saved, maximum ${run.maximum}; length adapts to your evidence`}
            />
            <div className={styles.workspace}>
              <aside className={styles.journeyRail} aria-label="Discovery journey">
                <p className={styles.eyebrow}>YOUR LEARNING PATH</p>
                <h2>
                  One decision.
                  <br />A clearer direction.
                </h2>
                <div className={styles.desktopMap}>
                  <LearningMap run={run} />
                </div>
                <details className={styles.mobileMap}>
                  <summary>
                    My learning map · {areaCountLabel(competencyNames.length)} core areas
                  </summary>
                  <LearningMap run={run} />
                </details>
                <div className={styles.railCompanion}>
                  <LearningCompanion compact />
                  <p>
                    Curiosity over perfection.
                    <br />
                    <strong>Take it at your pace.</strong>
                  </p>
                </div>
                <p className={styles.railNote}>
                  <ShieldCheck size={14} /> Saved as you go
                </p>
              </aside>
              <section className={styles.taskCard} key={current?.id}>
                {current && (
                  <>
                    <div className={styles.taskHeading}>
                      <p className={styles.eyebrow}>
                        <Code2 size={16} /> Task {run.answered + 1} <span>·</span>{' '}
                        {current.type === 'completion'
                          ? 'Code completion'
                          : current.type === 'ordering'
                            ? 'Repair workflow'
                            : current.type === 'prediction'
                              ? 'Trace & predict'
                              : 'Reasoning'}
                      </p>
                      <h1 ref={heading} tabIndex={-1}>
                        {current.title}
                      </h1>
                      <p className={styles.prompt}>{current.prompt}</p>
                    </div>
                    <QuestionControls
                      key={current.id}
                      run={run}
                      busy={busy}
                      onAnswer={async (answer) => {
                        await act(async () => {
                          const data = await request({
                            action: 'answer',
                            runId: run.id,
                            questionId: current.id,
                            answer,
                          });
                          setRun(data.run!);
                          setPhase(data.run!.status === 'completed' ? 'COMPLETED' : 'QUESTION');
                        });
                      }}
                      scenario={
                        <>
                          {current.code && (
                            <div className={styles.codePanel}>
                              <div>
                                <span className={styles.codeDot} /> Python{' '}
                                <span>Read & reason</span>
                              </div>
                              <pre>
                                <code>
                                  {current.code.split('\n').map((line, i) => (
                                    <span className={styles.codeLine} key={i}>
                                      <span className={styles.lineNumber} aria-hidden="true">
                                        {i + 1}
                                      </span>
                                      {line
                                        .split(
                                          /(\b(?:def|return|if|else|for|in|None|True|False|try|except|raise|finally)\b)/g,
                                        )
                                        .map((part, j) => (
                                          <span
                                            className={
                                              /^(def|return|if|else|for|in|None|True|False|try|except|raise|finally)$/.test(
                                                part,
                                              )
                                                ? styles.keyword
                                                : undefined
                                            }
                                            key={j}
                                          >
                                            {part}
                                          </span>
                                        ))}
                                    </span>
                                  ))}
                                </code>
                              </pre>
                            </div>
                          )}
                          {!current.code && (
                            <div className={styles.decisionVisual} aria-hidden="true">
                              <Compass size={42} />
                              <span>
                                Inspect <ArrowRight size={15} /> Decide <ArrowRight size={15} />{' '}
                                Verify
                              </span>
                            </div>
                          )}
                          <p className={styles.codeCaption}>
                            {current.code
                              ? 'Read the code closely.'
                              : 'Consider the situation and its consequences.'}{' '}
                            Your next decision is what matters.
                          </p>
                        </>
                      }
                      support={
                        <>
                          <div className={styles.hintArea}>
                            <button
                              type="button"
                              className={styles.quiet}
                              disabled={busy || !!run.hint}
                              onClick={() =>
                                void act(async () => {
                                  const data = await request({
                                    action: 'hint',
                                    runId: run.id,
                                    questionId: current.id,
                                  });
                                  setRun(data.run!);
                                })
                              }
                            >
                              <Lightbulb size={16} /> Process hint
                            </button>
                            {run.hint && <p role="status">{run.hint}</p>}
                          </div>
                          <details className={styles.why}>
                            <summary>Why this task?</summary>
                            <p>{diagnosticSentence(run.rationale)}</p>
                          </details>
                        </>
                      }
                    />
                  </>
                )}
              </section>
            </div>
          </>
        )}
        {phase === 'COMPLETED' && run?.report && (
          <section className={styles.report}>
            <p className={styles.eyebrow}>
              <Sparkles size={16} /> Your Python skill map
            </p>
            <h1 ref={heading} tabIndex={-1}>
              Evidence into direction.
            </h1>
            <LearningCompanion mood="matched" />
            <div className={styles.completionBadge} aria-hidden="true">
              <Sparkles size={36} />
            </div>
            <p className={styles.lead}>
              {countLabel(run.report.answered, 'response')} across{' '}
              {countLabel(run.report.findings.length, 'competency', 'competencies')}. A starting
              point for learning, with uncertainty kept visible.
            </p>
            <DiagnosticScore report={run.report} />
            <p>
              <Link
                href={`/diagnostic-v2?run=${run.id}${draftPreview ? '&preview=starter-v3' : '&preview=legacy'}`}
              >
                Bookmark this report
              </Link>{' '}
              <span className={styles.note}>· Requires this browser’s session cookie</span>
            </p>
            <p className={styles.note}>
              {run.report.stopReason} · Bank {run.report.bankId}
            </p>
            <h2>Assessed skill map</h2>
            <p>
              {countLabel(
                run.report.findings.filter((f) => f.status === 'Demonstrated strength').length,
                'strength',
              )}{' '}
              ·{' '}
              {countLabel(
                run.report.findings.filter((f) => f.status === 'Likely gap').length,
                'likely gap',
              )}{' '}
              ·{' '}
              {countLabel(
                run.report.findings.filter((f) => f.status === 'Insufficient evidence').length,
                'area needing more evidence',
                'areas needing more evidence',
              )}
              . These are preliminary diagnostic findings.
            </p>
            <div className={styles.findings}>
              {run.report.findings.map((f) => (
                <article key={f.competencyId}>
                  <span
                    className={
                      f.status === 'Demonstrated strength' ? styles.strength : styles.signal
                    }
                  >
                    {f.status}
                  </span>
                  <h2>{f.name}</h2>
                  <details>
                    <summary>Evidence and next steps</summary>
                    <p>{diagnosticSentence(f.reason)}</p>
                    <p>{f.nextStep}</p>
                    {f.hypotheses?.map((h) => (
                      <p key={h.label} className={styles.note}>
                        {h.state === 'mixed'
                          ? 'Mixed evidence (not confirmed)'
                          : h.confirmed
                            ? 'Repeated hypothesis (still preliminary)'
                            : 'Unconfirmed observation'}
                        : {h.label} ·{' '}
                        {countLabel(h.observations, 'independent family', 'independent families')}
                        {h.counterExamples
                          ? `; ${countLabel(h.counterExamples, 'contrasting independent probe')}`
                          : ''}
                        .
                      </p>
                    ))}
                    <p className={styles.note}>
                      {countLabel(f.count, 'response')} · {f.independent} unaided ·{' '}
                      {countLabel(f.correct, 'unaided match', 'unaided matches')} ·{' '}
                      {countLabel(f.types, 'task type')}
                    </p>
                    {f.unsure !== undefined && (
                      <p className={styles.note}>
                        {countLabel(f.incorrect ?? 0, 'independent miss', 'independent misses')} ·{' '}
                        {f.unsure} unsure · {countLabel(f.assistedCount ?? 0, 'assisted answer')}{' '}
                        (excluding unsure) ·{' '}
                        {countLabel(
                          f.familyCount ?? 0,
                          'independent family',
                          'independent families',
                        )}
                        . Unsure responses do not establish a gap.
                      </p>
                    )}
                    {f.difficultyEvidence?.map((level) => (
                      <p className={styles.note} key={level.level}>
                        {['Beginner', 'Intermediate', 'Advanced'][level.level - 1]}:{' '}
                        {countLabel(level.correct, 'unaided match', 'unaided matches')},{' '}
                        {countLabel(level.incorrect, 'unaided miss', 'unaided misses')}
                        {level.unsure ? `, ${level.unsure} unsure` : ''}
                        {level.assisted ? `, ${level.assisted} assisted` : ''}.
                      </p>
                    ))}
                    {f.prerequisites.length > 0 && (
                      <p className={styles.note}>
                        Prerequisites:{' '}
                        {f.prerequisites
                          .map(
                            (id) => run.report!.findings.find((s) => s.competencyId === id)?.name,
                          )
                          .join(', ')}
                      </p>
                    )}
                    <Link
                      href={`/diagnostic-v2/learn?skill=${encodeURIComponent(f.moduleSkillId) + '&subskill=' + encodeURIComponent(f.nextSubskill ?? '')}`}
                    >
                      Explore the SkillSetu module <ArrowRight size={14} />
                    </Link>
                  </details>
                </article>
              ))}
            </div>
            {learningEnabled && (
              <AdaptiveLearningRecommendation key={`revision-${run.id}`} sourceRunId={run.id} />
            )}
            {learningEnabled && <DiagnosticLearningPathway key={run.id} sourceRunId={run.id} />}
            <details className={styles.nextPlan}>
              <summary>All report learning links</summary>
              <h2>
                {learningEnabled ? 'Existing guided practice links' : 'Your next learning steps'}
              </h2>
              {run.report.learningOrder.length ? (
                <ol>
                  {run.report.learningOrder.map((id) => {
                    const f = run.report!.findings.find((s) => s.competencyId === id)!;
                    return (
                      <li key={id}>
                        <Link
                          href={`/diagnostic-v2/learn?skill=${f.moduleSkillId}&subskill=${encodeURIComponent(f.nextSubskill ?? '')}`}
                        >
                          {f.name}
                        </Link>{' '}
                        <span>
                          —{' '}
                          {f.status === 'Likely gap'
                            ? 'repair the suspected gap'
                            : 'study, then collect fresh evidence'}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p>
                  Try a fresh practical project and independent review to confirm these preliminary
                  strengths.
                </p>
              )}
              <p>
                Learning and practice do not change this diagnostic. Reassessment collects new
                evidence and may give a different result.
              </p>
            </details>

            <button className={styles.primary} disabled={busy} onClick={() => void start(true)}>
              <RotateCcw size={16} /> Start an independent fresh diagnostic
            </button>
            <button
              className={styles.quiet}
              disabled={busy}
              onClick={() => void start(true, 'prior-informed')}
            >
              Reassess using my prior report for routing
            </button>
            <p className={styles.note}>
              Independent runs ignore previous reports. Reassessment starts at a previous gap and
              grants no previous credit. Question families can become familiar across attempts and
              affect results. Earlier reports remain stored.
            </p>
            <section
              aria-label="Final question review"
              id="diagnostic-question-review"
              className={styles.finalReview}
            >
              <h2>Review every question</h2>
              <details className={styles.review}>
                <summary>Review your submitted evidence &amp; explanations</summary>
                <DiagnosticQuestionReview
                  key={run.id}
                  entries={
                    run.review ??
                    run.report.evidence.map((e) => ({ ...e, question: null, answer: null }))
                  }
                />
              </details>
            </section>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        <span>SkillSetu · build skills with direction.</span>
        <span>Diagnostic evidence ≠ practice rewards</span>
      </footer>
    </div>
  );
}
function LearningMap({ run }: { run: RunView }) {
  return (
    <div className={styles.coverage}>
      {run.competencies.map((c, i) => (
        <div
          key={c.id}
          className={run.current?.competencyId === c.id ? styles.activeCompetency : ''}
          aria-current={run.current?.competencyId === c.id ? 'step' : undefined}
        >
          <span className={styles.mapNumber} aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span>
            <b>{c.name}</b>
            <small>{countLabel(c.count, 'response')}</small>
          </span>
          {run.current?.competencyId === c.id && (
            <span className={styles.currentDot} aria-hidden="true" />
          )}
        </div>
      ))}
      <p className={styles.note}>
        Progress counts saved responses. It doesn’t measure proficiency.
      </p>
    </div>
  );
}

function QuestionControls({
  run,
  busy,
  onAnswer,
  scenario,
  support,
}: {
  run: RunView;
  scenario: ReactNode;
  support: ReactNode;
  busy: boolean;
  onAnswer: (answer: Answer) => Promise<void>;
}) {
  const q = run.current!,
    storageKey = `diagnostic:${run.id}:${q.id}`;
  const [answer, setAnswer] = useState<Answer>(() => {
    const fallback =
      run.draft.order || run.draft.text || run.draft.blocks || run.draft.selected !== undefined
        ? run.draft
        : q.steps
          ? { order: q.steps.map((s) => s.id) }
          : {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          (!parsed.order || Array.isArray(parsed.order))
        )
          return parsed;
      }
    } catch {
      /* Server draft remains available. */
    }
    return fallback;
  });
  const [saved, setSaved] = useState('Your submitted answers are saved automatically.');
  const [formatError, setFormatError] = useState('');
  const answerInput = useRef<HTMLInputElement>(null);
  const formatMessage = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (formatError)
      formatMessage.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [formatError]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answer));
    } catch {
      /* Server autosave still works. */
    }
    if (busy) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request(
        {
          action: 'draft',
          runId: run.id,
          questionId: q.id,
          answer: answer.text === '' ? {} : answer,
        },
        controller.signal,
      )
        .then(() => setSaved('Draft saved to your session.'))
        .catch(() => {
          if (!controller.signal.aborted)
            setSaved('Draft kept in this browser. Reconnect before submitting.');
        });
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [answer, busy, storageKey, q.id, run.id]);
  const ready = q.codeSlots
    ? answer.text === 'unsure' ||
      q.codeSlots.every((s) => s.choices.some((c) => c.id === answer.blocks?.[s.id]))
    : q.type === 'decision'
      ? answer.selected !== undefined ||
        (!!q.context.startsWith('Draft preview') && answer.text === 'unsure')
      : q.type === 'ordering'
        ? !!answer.order
        : !!answer.text?.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || busy) return;
        const invalid =
          q.numeric && answer.text?.trim().toLowerCase() !== 'unsure'
            ? numericFormatError(q.numeric, answer.text ?? '')
            : null;
        if (invalid) {
          setFormatError(invalid + ' This format error does not count as a response.');
          answerInput.current?.focus();
          return;
        }
        setFormatError('');
        void onAnswer(answer);
      }}
      className={styles.taskBody}
      data-blocks={!!q.codeSlots}
    >
      <div className={styles.codeWorkspace}>
        <p className={styles.workspaceLabel}>
          <Code2 size={15} /> THE SCENARIO <span>01 / READ</span>
        </p>
        {q.codeSlots ? (
          <CodeBlockComposer question={q} answer={answer} onChange={setAnswer} disabled={busy} />
        ) : (
          scenario
        )}
        <DiagnosticManipulation question={q} onDraft={(text) => setAnswer({ text })} />
      </div>
      <div className={styles.responseWorkspace}>
        <p className={styles.workspaceLabel}>
          <Compass size={15} /> YOUR MOVE <span>02 / DECIDE</span>
        </p>
        <div className={styles.answer}>
          {q.codeSlots ? (
            <div className={styles.blockAnswerSummary}>
              <h2>Build your answer in the code</h2>
              <p>
                Fill every blank, or save an unsure response. You can change your choices before
                submitting.
              </p>
              <button
                type="button"
                className={styles.unsureBlock}
                disabled={busy}
                aria-pressed={answer.text === 'unsure'}
                onClick={() =>
                  setAnswer(answer.text === 'unsure' ? { blocks: {} } : { text: 'unsure' })
                }
              >
                I’m not sure
              </button>
              {answer.text === 'unsure' && (
                <p role="status">This response will be recorded as unsure.</p>
              )}
            </div>
          ) : q.options ? (
            <fieldset disabled={busy}>
              <legend>Choose your answer</legend>
              {q.options.map((option, selected) => (
                <label key={option} className={answer.selected === selected ? styles.selected : ''}>
                  <input
                    type="radio"
                    name={q.id}
                    aria-label={optionPresentation(option).accessible}
                    checked={answer.selected === selected}
                    onChange={() => setAnswer({ selected })}
                  />
                  <span className={styles.optionKey} aria-hidden="true">
                    {q.context.startsWith('Draft preview')
                      ? String.fromCharCode(65 + selected)
                      : selected + 1}
                  </span>
                  <DiagnosticOption text={option} />
                </label>
              ))}
            </fieldset>
          ) : q.steps ? (
            <div>
              <p>Move every step into the safest sequence.</p>
              <ol className={styles.orderList}>
                {answer.order?.map((id, i) => (
                  <li key={id}>
                    <span>{q.steps!.find((s) => s.id === id)?.text}</span>
                    <div>
                      {[-1, 1].map((direction) => (
                        <button
                          type="button"
                          key={direction}
                          disabled={busy || i + direction < 0 || i + direction >= q.steps!.length}
                          aria-label={`Move step ${i + 1} ${direction < 0 ? 'up' : 'down'}`}
                          onClick={() => {
                            const order = [...answer.order!];
                            [order[i], order[i + direction]] = [order[i + direction], order[i]];
                            setAnswer({ order });
                          }}
                        >
                          {direction < 0 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <>
              <label htmlFor="diagnostic-answer">{q.accessibility.inputLabel}</label>
              <input
                id="diagnostic-answer"
                ref={answerInput}
                type="text"
                inputMode={q.numeric ? 'decimal' : undefined}
                aria-invalid={formatError ? true : undefined}
                aria-describedby={
                  [
                    q.numeric ? 'diagnostic-numeric-hint' : '',
                    formatError ? 'diagnostic-format-error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={1000}
                value={answer.text ?? ''}
                disabled={busy}
                onChange={(e) => {
                  setFormatError('');
                  setAnswer({ text: e.target.value });
                }}
                placeholder={
                  q.type === 'completion'
                    ? 'Enter only the missing fragment'
                    : 'Enter the value or Python name'
                }
              />
              {formatError && (
                <p
                  ref={formatMessage}
                  id="diagnostic-format-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {formatError}
                </p>
              )}
              <p className={styles.note} id="diagnostic-numeric-hint">
                {q.numeric
                  ? q.numeric.hint + ' Formatting errors do not count as responses.'
                  : 'Use the requested format. Code fragments are checked against authored answers. If unsure, enter “unsure”.'}
              </p>
            </>
          )}
          {!q.codeSlots && q.context.startsWith('Draft preview') && (
            <button
              className={styles.unsureBlock}
              type="button"
              disabled={busy}
              aria-pressed={answer.text === 'unsure'}
              onClick={() => {
                setFormatError('');
                setAnswer({ text: 'unsure' });
              }}
            >
              I’m not sure
            </button>
          )}
          <div className={styles.submitRow}>
            <span role="status" className={styles.note}>
              {busy ? 'Saving your response…' : saved}
            </span>
            <button className={styles.primary} disabled={busy || !ready}>
              {busy ? 'Saving…' : 'Submit response'} <ArrowRight size={18} />
            </button>
          </div>
        </div>
        {support}
      </div>
    </form>
  );
}
