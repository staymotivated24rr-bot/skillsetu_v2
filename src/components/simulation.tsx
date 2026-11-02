'use client';
import { useState } from 'react';
import { ArrowRight, Check, FileText, MessageCircle, Send } from 'lucide-react';
import type { AttemptView, DemoState } from '@/lib/types';
import { Meter } from './ui';
export function SimulationRunner({
  state,
  attempt,
  busy,
  submit,
  finish,
}: {
  state: DemoState;
  attempt: AttemptView;
  busy: boolean;
  submit: (questionId: string, selected: number) => Promise<void>;
  finish: () => Promise<void>;
}) {
  const simulations = state.scenarios[attempt.kind as 'diagnostic' | 'reassessment'];
  const actions = simulations.flatMap((s, si) => s.items.map((q, qi) => ({ q, s, si, qi })));
  const [selected, setSelected] = useState<number | null>(null);
  const [showFollowup, setShowFollowup] = useState(false);
  const current = actions[Math.min(attempt.answers.length, actions.length - 1)];
  const previous = actions.find((a) => a.q.id === attempt.answers.at(-1)?.questionId);
  const display = showFollowup && previous ? previous : current;
  const answer = attempt.answers.at(-1);
  const caseAnswers = attempt.answers.filter((a) =>
    display.s.items.some((q) => q.id === a.questionId),
  );
  async function send() {
    if (selected === null) return;
    try {
      await submit(current.q.id, selected);
      setSelected(null);
      setShowFollowup(true);
    } catch {
      /* The workspace displays the request error; keep this action available. */
    }
  }
  const done = attempt.answers.length === actions.length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {attempt.kind === 'diagnostic' ? 'WORKPLACE DIAGNOSTIC' : 'VERIFY YOUR PROGRESS'}
          </span>
          <h1>
            {attempt.kind === 'diagnostic'
              ? `Step into the ${state.role.name.toLowerCase()}’s seat.`
              : 'New cases. Fresh evidence.'}
          </h1>
          <p>Make the calls you would make at work. Your responses are saved as you go.</p>
        </div>
        <span className="badge">
          {attempt.answers.length} / {actions.length} actions saved
        </span>
      </div>
      <Meter
        value={(attempt.answers.length / actions.length) * 100}
        label="Assessment completion"
      />
      <div className="simulation-layout">
        <aside className="case-panel card">
          <div className="case-index">CASE {display.si + 1} OF 3</div>
          <h2>{display.s.title}</h2>
          <p className="muted">{display.s.company}</p>
          <div className="stakeholder">
            <div className="avatar">
              {display.s.stakeholder
                .split(' ')
                .map((x) => x[0])
                .join('')}
            </div>
            <div>
              <b>{display.s.stakeholder}</b>
              <small>{display.s.stakeholderRole}</small>
            </div>
            <MessageCircle size={18} />
          </div>
          <blockquote>“{display.s.brief}”</blockquote>
          {caseAnswers.length > 0 && (
            <details className="case-conversation">
              <summary>
                <MessageCircle size={14} /> Conversation so far{' '}
                <span>{caseAnswers.length} actions</span>
              </summary>
              {caseAnswers.map((a) => {
                const item = display.s.items.find((q) => q.id === a.questionId)!;
                return (
                  <div key={a.questionId}>
                    <small>{item.phase}</small>
                    <p>
                      <b>You:</b> {item.options[a.selected].text}
                    </p>
                    <p>
                      <b>{display.s.stakeholder.split(' ')[0]}:</b> {a.response}
                    </p>
                  </div>
                );
              })}
            </details>
          )}
          <div className="file-label">
            <FileText size={16} /> Your case file
          </div>
          <pre>{display.s.data}</pre>
          <div className="case-list">
            {simulations.map((s, i) => (
              <div key={s.id} className={i === display.si ? 'active' : ''}>
                <span>
                  {attempt.answers.filter((a) => s.items.some((q) => q.id === a.questionId))
                    .length === 8 ? (
                    <Check size={14} />
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </span>
                {s.title}
              </div>
            ))}
          </div>
        </aside>
        <section className="action-panel card" aria-live="polite">
          {showFollowup && answer && previous ? (
            <>
              <span className="eyebrow">ACTION RECORDED</span>
              <h2>{previous.q.phase}: your recommendation</h2>
              <div className="submitted-answer">{previous.q.options[answer.selected].text}</div>
              <div className="reply">
                <div className="file-label">
                  <MessageCircle size={17} />
                  {previous.s.stakeholder} replies
                </div>
                <p>{answer.response}</p>
              </div>
              <p className="small muted">
                This stakeholder response continues the scenario. Correctness and skill feedback
                appear after you submit the full assessment.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowFollowup(false);
                  setSelected(null);
                }}
              >
                {done
                  ? 'Review submission'
                  : current.si !== previous.si
                    ? 'Open next case'
                    : 'Next action'}
                <ArrowRight size={17} />
              </button>
            </>
          ) : done ? (
            <>
              <div className="success-symbol">
                <Check size={28} />
              </div>
              <span className="eyebrow">THREE CASES COMPLETE</span>
              <h2>Your decisions are ready to review.</h2>
              <p>
                Submit to calculate proficiency from your 24 saved actions. We’ll show what you
                demonstrated and which gaps deserve attention first.
              </p>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void finish().catch(() => {})}
              >
                Submit assessment
                <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <>
              <div className="action-heading">
                <span className="badge badge-green">{current.q.phase}</span>
                <span className="muted small">Action {current.qi + 1} / 8</span>
              </div>
              <h2>{current.q.prompt}</h2>
              <p className="context">{current.q.context}</p>
              <fieldset className="options">
                <legend className="sr-only">Choose your next action</legend>
                {current.q.options.map((o, i) => (
                  <label
                    key={current.q.id + '-' + i}
                    className={`option ${selected === i ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={current.q.id}
                      value={i}
                      checked={selected === i}
                      onChange={() => setSelected(i)}
                      disabled={busy}
                    />
                    <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                    <span>{o.text}</span>
                  </label>
                ))}
              </fieldset>
              <button
                className="btn btn-primary"
                onClick={send}
                disabled={selected === null || busy}
              >
                Send response
                <Send size={16} />
              </button>
              <div className="skill-measure">
                <span>MEASURING</span>
                {current.q.skills.map((m) => (
                  <span className="tag" key={m.skillId}>
                    {state.skills.find((s) => s.id === m.skillId)?.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
      <p className="footnote">
        Structured choices are graded using original deterministic rubrics. This short prototype is
        not a validated assessment. There is no time limit; refreshing resumes at your next
        unanswered action.
      </p>
    </>
  );
}
