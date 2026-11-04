'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { PublicPythonTrace, TraceReply } from '@/lib/learning-studio/trace-types';
import {
  acceptTraceReveal,
  initialTraceState,
  moveTrace,
  resetTrace,
  selectTracePrediction,
} from '@/lib/learning-studio/trace-state';
import styles from './python-trace-visualizer.module.css';

export async function traceRequest(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<TraceReply> {
  const response = await fetch('/api/diagnostic-v2/learning', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  const reply = await response.json();
  if (!response.ok) throw new Error(reply.error ?? 'Could not load this authored trace.');
  return reply;
}

/** Generic renderer; no interpreter, learner-code evaluation, autoplay or proficiency writes. */
export function PythonTraceVisualizer({ trace }: { trace: PublicPythonTrace }) {
  const [state, setState] = useState(() => initialTraceState(trace));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null),
    generation = useRef(0);
  const id = useId();
  const current = state.revealed[state.cursor],
    frame = current.frame;
  const cachedNext = state.cursor < state.revealed.length - 1;
  const finished = state.cursor === current.frameCount - 1;
  const blocked = !cachedNext && !!current.nextPrediction && state.selected === undefined;
  useEffect(
    () => () => {
      generation.current++;
      pending.current?.abort();
    },
    [],
  );
  function reset() {
    generation.current++;
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setError('');
    setState((s) => resetTrace(s));
  }
  async function next() {
    if (busy || finished || blocked) return;
    setError('');
    if (cachedNext) {
      setState((s) => moveTrace(s, 1));
      return;
    }
    const token = ++generation.current;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      const reply = await traceRequest(
        {
          action: 'trace-next',
          traceId: current.id,
          version: current.version,
          index: state.cursor + 1,
          ...(state.selected !== undefined ? { selected: state.selected } : {}),
        },
        controller.signal,
      );
      if (token === generation.current) setState(acceptTraceReveal(state, reply));
    } catch (e) {
      if (token === generation.current)
        setError(
          e instanceof Error ? e.message : 'Trace request interrupted. Retry the same step.',
        );
    } finally {
      if (token === generation.current) {
        setBusy(false);
        pending.current = null;
      }
    }
  }
  return (
    <section className={styles.workspace} aria-label={`${trace.title} workspace`}>
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>AUTHORED PYTHON SIMULATION · {trace.kind}</p>
          <h2>{trace.title}</h2>
        </div>
        <span>
          Step {state.cursor} / {current.frameCount - 1}
        </span>
      </header>
      <p>{trace.introduction}</p>
      <p className={styles.note}>
        Deterministic teaching model, not output from executing Python. Predictions are practice
        only; they do not change lesson mastery or diagnostic scores.
      </p>
      <div className={styles.columns}>
        <section aria-label="Python code" className={styles.code}>
          <p>
            {frame.line
              ? `Line ${frame.line} just modeled as executed`
              : 'Before the first statement'}
          </p>
          <ol>
            {trace.code.map((line, index) => (
              <li
                key={index}
                aria-current={frame.line === index + 1 ? 'step' : undefined}
                className={frame.line === index + 1 ? styles.active : undefined}
              >
                <span className={styles.lineNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <code>{line || ' '}</code>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.state} aria-label="Visible variable state">
          <h3>Variable state</h3>
          {!frame.variables.length ? (
            <p>No names bound yet.</p>
          ) : (
            <dl>
              {frame.variables.map((v) => (
                <div key={`${v.scope}/${v.name}`}>
                  <dt>
                    <span>{v.scope}</span>
                    <code>{v.name}</code>
                  </dt>
                  <dd>
                    <code>{v.value}</code>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {frame.objects.length > 0 && (
            <section aria-label="List reference map">
              <h3>Names → objects</h3>
              <p className={styles.note}>
                Object labels are symbolic teaching labels, not memory addresses.
              </p>
              <ul>
                {frame.references.map((r) => (
                  <li key={r.name}>
                    <code>{r.name}</code> → object {r.objectId}
                  </li>
                ))}
              </ul>
              <div className={styles.objects}>
                {frame.objects.map((o) => (
                  <div key={o.id}>
                    <strong>
                      Object {o.id} · {o.mutable ? 'mutable' : 'immutable'}
                    </strong>
                    <code>{o.value}</code>
                  </div>
                ))}
              </div>
            </section>
          )}
          {frame.iteration && (
            <p className={styles.iteration}>
              Iteration {frame.iteration.number} ·{' '}
              {frame.iteration.phase === 'finished'
                ? 'range exhausted; body will not run again'
                : `body; current value = ${frame.iteration.value}`}
            </p>
          )}
          {frame.stack.length > 0 && (
            <section aria-label="Function call stack">
              <h3>Call stack · active call last</h3>
              <ol className={styles.stack}>
                {frame.stack.map((call, index) => (
                  <li key={`${index}/${call.name}`}>
                    <strong>
                      {call.name}
                      {index === frame.stack.length - 1 ? ' · active' : ' · waiting'}
                    </strong>
                    <p>
                      {call.locals.length
                        ? call.locals.map((v) => `${v.name} = ${v.value}`).join(', ')
                        : 'No local values yet.'}
                    </p>
                    {call.returning !== undefined && (
                      <p>
                        Returning: <code>{call.returning}</code>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
          <h3>Printed output</h3>
          <pre aria-label="Printed output">
            {frame.output.length ? frame.output.join('\n') : '(nothing printed yet)'}
          </pre>
        </section>
      </div>
      <div className={styles.explanation} role="status" aria-live="polite" aria-atomic="true">
        {frame.explanation}
      </div>
      {state.feedback && (
        <p role="status" className={styles.feedback}>
          <strong>
            {state.feedback.correct
              ? 'Your prediction matched.'
              : 'A useful contrast to your prediction.'}
          </strong>{' '}
          {state.feedback.explanation}
        </p>
      )}
      {current.nextPrediction && !cachedNext && !finished && (
        <fieldset disabled={busy} className={styles.prediction}>
          <legend>Predict before reveal</legend>
          <p>{current.nextPrediction.prompt}</p>
          {current.nextPrediction.options.map((option, index) => (
            <label key={index}>
              <input
                type="radio"
                name={`${id}-prediction`}
                checked={state.selected === index}
                onChange={() => setState((s) => selectTracePrediction(s, index))}
              />
              <code>{option}</code>
            </label>
          ))}
          <p id={`${id}-hint`}>
            Choose an option to reveal the next state. A mismatch still lets you learn from the
            explanation.
          </p>
        </fieldset>
      )}
      {error && (
        <p role="alert">
          {error} Your current state and prediction are retained. Try Next again or reset.
        </p>
      )}
      <nav className={styles.controls} aria-label="Trace execution controls">
        <button
          type="button"
          disabled={state.cursor === 0 || busy}
          onClick={() => {
            setError('');
            setState((s) => moveTrace(s, -1));
          }}
        >
          Previous execution step
        </button>
        <button
          type="button"
          disabled={finished || busy || blocked}
          aria-describedby={blocked ? `${id}-hint` : undefined}
          onClick={() => void next()}
        >
          {busy ? 'Revealing…' : 'Next execution step'}
        </button>
        <button type="button" onClick={reset}>
          {finished ? 'Reset and replay' : 'Reset trace'}
        </button>
      </nav>
      <p className={styles.note}>
        Use Tab to move between controls, arrow keys within prediction options, and Enter or Space
        to activate buttons. Replay is manual; no automatic execution or motion.
      </p>
      {finished && (
        <p role="status">Trace complete. Review earlier steps or reset to predict again.</p>
      )}
    </section>
  );
}
