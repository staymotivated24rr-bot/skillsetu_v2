'use client';
import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Timer,
  Zap,
} from 'lucide-react';
import type { DemoState, PublicLesson } from '@/lib/types';
import { mastery, planGaps } from '@/lib/engine';
import { Empty, Meter } from './ui';
export function Learning({
  state,
  lessonId,
  busy,
  open,
  changeMode,
  practice,
  restart,
  reassess,
}: {
  state: DemoState;
  lessonId: string | null;
  busy: boolean;
  open: (id: string) => Promise<void>;
  changeMode: (id: string, mode: 'interactive' | 'structured') => Promise<void>;
  practice: (
    id: string,
    itemId: string,
    selected?: number,
  ) => Promise<{ correct?: boolean; explanation?: string; hint?: string }>;
  restart: (id: string) => Promise<void>;
  reassess: () => Promise<void>;
}) {
  const latest = state.attempts.filter((a) => a.status === 'complete').at(-1);
  const gaps = latest ? planGaps(latest.scores, state.skills) : [];
  const lesson = state.lessons.find((l) => l.id === lessonId);
  const [showAll, setShowAll] = useState(false);
  if (!latest)
    return (
      <Empty
        title="First, find your gaps."
        text="Complete the workplace diagnostic to get a learning plan based on your decisions."
      />
    );
  if (lesson)
    return (
      <LessonRunner
        key={lesson.id}
        lesson={lesson}
        state={state}
        busy={busy}
        changeMode={changeMode}
        practice={practice}
        restart={restart}
        reassess={reassess}
      />
    );
  const completed = state.progress.filter((p) => p.status === 'mastered').length;
  const list = showAll ? state.skills : gaps;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SHORTEST PATH</span>
          <h1>Learn what moves you forward.</h1>
          <p>Focused lessons for the gaps you demonstrated. Strong skills stay out of your way.</p>
        </div>
        <span className="badge badge-green">
          {completed} / {state.lessons.length} modules mastered
        </span>
      </div>
      <div className="learning-banner">
        <div>
          <Zap size={22} />
          <div>
            <h3>
              {gaps.length ? `${gaps.length} skills to strengthen` : 'Every prototype target met'}
            </h3>
            <p>
              Plans respect prerequisites. Practice mastery is recorded separately from assessed
              proficiency.
            </p>
          </div>
        </div>
        <button
          className="btn btn-light"
          onClick={() => void reassess().catch(() => {})}
          disabled={busy}
        >
          Verify with new cases
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="section-title">
        <h2>{showAll ? 'All learning modules' : 'Your prioritized plan'}</h2>
        <button className="text-btn" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show only gaps' : 'Browse all modules'}
        </button>
      </div>
      {!list.length && (
        <Empty
          title="A good moment to verify."
          text="Your current assessment meets every role target. You can still browse modules or reassess using fresh workplace cases."
        />
      )}
      <div className="module-grid">
        {list.map((g, i) => {
          const l = state.lessons.find((l) => l.skillId === g.id)!;
          const progress = state.progress.find((p) => p.lessonId === l.id);
          const mastered = progress?.status === 'mastered';
          const current = latest.scores.find((s) => s.skillId === g.id)?.score ?? 0;
          return (
            <article className="card module-card" key={g.id}>
              <div className="module-top">
                <span className="eyebrow">
                  {showAll ? g.category : `PRIORITY ${String(i + 1).padStart(2, '0')}`}
                </span>
                {mastered ? (
                  <span className="badge badge-green">
                    <Check size={12} />
                    Mastered
                  </span>
                ) : (
                  <Timer size={17} />
                )}
              </div>
              <h3>{l.title}</h3>
              <span className="muted small">{g.name}</span>
              <p>{g.description}</p>
              <div className="score-line">
                <span>
                  Current <b>{current}%</b>
                </span>
                <span>
                  Target <b>{g.target}%</b>
                </span>
              </div>
              <Meter value={current} target={g.target} label={g.name} />
              <p className="small muted">
                {'blockedBy' in g && (g.blockedBy as string[]).length
                  ? `First: ${g.prerequisites.map((id) => state.skills.find((s) => s.id === id)?.name).join(', ')}`
                  : `${l.minutes} min · 4 guided problems · 2 learning styles`}
              </p>
              <button
                className={`btn ${i === 0 && !mastered ? 'btn-primary' : 'btn-outline'}`}
                disabled={busy}
                onClick={() => void open(l.id).catch(() => {})}
              >
                {mastered ? 'Review lesson' : progress ? 'Continue learning' : 'Start learning'}
                <ArrowRight size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}
function LessonRunner({
  lesson,
  state,
  busy,
  changeMode,
  practice,
  restart,
  reassess,
}: {
  lesson: PublicLesson;
  state: DemoState;
  busy: boolean;
  changeMode: (id: string, mode: 'interactive' | 'structured') => Promise<void>;
  practice: (
    id: string,
    itemId: string,
    selected?: number,
  ) => Promise<{ correct?: boolean; explanation?: string; hint?: string }>;
  restart: (id: string) => Promise<void>;
  reassess: () => Promise<void>;
}) {
  const progress = state.progress.find((p) => p.lessonId === lesson.id);
  const mode = progress?.mode ?? 'interactive';
  const answers = progress?.answered ?? [];
  const result = mastery(lesson.content.items, answers);
  const [step, setStep] = useState(() =>
    Math.min(
      lesson.content.items.findIndex((i) => !answers.some((a) => a.itemId === i.id)),
      lesson.content.items.length - 1,
    ),
  );
  const [selection, setSelection] = useState<number | null>(null);
  const [hint, setHint] = useState('');
  const currentStep = step < 0 ? lesson.content.items.length : step;
  const item = lesson.content.items[currentStep];
  const existing = item ? answers.filter((a) => a.itemId === item.id).at(-1) : undefined;
  const [feedback, setFeedback] = useState<{ correct?: boolean; explanation?: string } | null>(
    null,
  );
  const displayFeedback = feedback ?? existing;
  const [showConcept, setShowConcept] = useState(false);
  async function send() {
    if (selection === null || !item) return;
    try {
      const f = await practice(lesson.id, item.id, selection);
      setFeedback(f);
    } catch {
      /* Request errors are displayed by the workspace. */
    }
  }
  const concept = (
    <div className="concept-content">
      <span className="eyebrow">THE CONCEPT</span>
      <h3>{lesson.content.introduction}</h3>
      <div className="intuition">
        <Lightbulb size={19} />
        <p>{lesson.content.intuition}</p>
      </div>
      <h4>A worked example</h4>
      <p className="worked-example">{lesson.content.example}</p>
      <h4>Keep this with you</h4>
      <p>{lesson.content.summary}</p>
    </div>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MICRO-LESSON · {lesson.minutes} MIN</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.content.objective}</p>
        </div>
        <span className="badge">Practice run {progress?.run ?? 1}</span>
      </div>
      <div className="lesson-layout">
        <aside className="card lesson-guide">
          <span className="eyebrow">LEARN YOUR WAY</span>
          <div className="mode-switch">
            <button
              className={mode === 'interactive' ? 'active' : ''}
              disabled={busy}
              onClick={() => void changeMode(lesson.id, 'interactive').catch(() => {})}
            >
              <Zap size={16} />
              Interactive
            </button>
            <button
              className={mode === 'structured' ? 'active' : ''}
              disabled={busy}
              onClick={() => void changeMode(lesson.id, 'structured').catch(() => {})}
            >
              <BookOpen size={16} />
              Structured
            </button>
          </div>
          <p className="small muted">
            Same objectives and mastery checks. Choose problems first or explanations first.
          </p>
          <div className="lesson-steps">
            {['Try the idea', 'Build confidence', 'Apply it', 'Mastery check'].map((label, i) => (
              <button
                key={label}
                disabled={
                  i > 0 && !answers.some((a) => a.itemId === lesson.content.items[i - 1].id)
                }
                className={currentStep === i ? 'active' : ''}
                onClick={() => {
                  setStep(i);
                  setSelection(null);
                  setFeedback(null);
                  setHint('');
                }}
              >
                <span>
                  {answers.some((a) => a.itemId === lesson.content.items[i].id) ? (
                    <Check size={13} />
                  ) : (
                    i + 1
                  )}
                </span>
                {label}
              </button>
            ))}
          </div>
          <Meter
            value={(answers.filter((a) => a.first).length / 4) * 100}
            label="Practice completion"
          />
          <p className="small muted">
            Mastery requires 3 of 4 correct first responses, including the final application.
            Retries help you learn; a new run can verify mastery.
          </p>
        </aside>
        <section className="card lesson-work" aria-live="polite">
          {mode === 'structured' && concept}
          {currentStep >= 4 ? (
            <div className="lesson-complete">
              <div className="success-symbol">
                <CheckCircle2 size={28} />
              </div>
              <span className="eyebrow">PRACTICE COMPLETE</span>
              <h2>
                {result.mastered
                  ? 'You demonstrated this lesson’s objectives.'
                  : 'A little more practice will help.'}
              </h2>
              <p>
                {result.correct} / {result.total} correct first responses.{' '}
                {result.mastered
                  ? 'This module is recorded as mastered.'
                  : 'Review the explanations and try a new practice run when ready.'}{' '}
                Your assessment score stays unchanged until reassessment.
              </p>
              <div className="actions">
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void reassess().catch(() => {})}
                >
                  Verify in a fresh case
                  <ArrowRight size={16} />
                </button>
                <button
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await restart(lesson.id);
                      setStep(0);
                      setFeedback(null);
                      setSelection(null);
                      setHint('');
                    } catch {
                      /* Preserve the current run if restart fails. */
                    }
                  }}
                >
                  New practice run
                  <RotateCcw size={15} />
                </button>
              </div>
              {mode === 'interactive' && concept}
            </div>
          ) : (
            <>
              <div className="action-heading">
                <span className="badge badge-green">
                  {currentStep === 3 ? 'Mastery check' : `Problem ${currentStep + 1}`}
                </span>
                <span className="small muted">{currentStep + 1} / 4</span>
              </div>
              <h2>{item.prompt}</h2>
              <fieldset className="options">
                <legend className="sr-only">Choose your answer</legend>
                {item.options.map((o, i) => (
                  <label
                    key={item.id + '-' + i}
                    className={`option ${selection === i ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={item.id}
                      value={i}
                      checked={selection === i}
                      onChange={() => setSelection(i)}
                      disabled={busy}
                    />
                    <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                    <span>{o}</span>
                  </label>
                ))}
              </fieldset>
              <div className="actions">
                <button
                  className="btn btn-primary"
                  disabled={busy || selection === null}
                  onClick={send}
                >
                  {displayFeedback ? 'Try this answer' : 'Check answer'}
                  <ArrowRight size={16} />
                </button>
                <button
                  className="text-btn"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const h = await practice(lesson.id, item.id);
                      setHint(h.hint ?? '');
                    } catch {
                      /* Keep the practice item available on request failure. */
                    }
                  }}
                >
                  <Lightbulb size={16} />
                  Need a hint?
                </button>
              </div>
              {hint && (
                <div className="hint">
                  <Lightbulb size={17} />
                  <p>{hint}</p>
                </div>
              )}
              {displayFeedback && (
                <div className={`feedback ${displayFeedback.correct ? 'correct' : 'incorrect'}`}>
                  <b>
                    {displayFeedback.correct
                      ? 'That’s right.'
                      : 'Not quite — here’s the reasoning.'}
                  </b>
                  <p>{displayFeedback.explanation}</p>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setStep(currentStep + 1);
                      setSelection(null);
                      setFeedback(null);
                      setHint('');
                    }}
                  >
                    {currentStep === 3 ? 'See mastery result' : 'Next problem'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {mode === 'interactive' && (
                <>
                  <button
                    className="concept-toggle text-btn"
                    onClick={() => setShowConcept(!showConcept)}
                  >
                    <BookOpen size={16} />
                    {showConcept ? 'Hide explanation' : 'Explore the concept & worked example'}
                  </button>
                  {showConcept && concept}
                </>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
