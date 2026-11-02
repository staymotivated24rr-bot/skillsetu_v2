'use client';
import { useState } from 'react';
import styles from './diagnostic.module.css';
import type { PublicQuestion } from '@/lib/diagnostic/types';
export function DiagnosticManipulation({
  question: q,
  onDraft,
}: {
  question: PublicQuestion;
  onDraft: (text: string) => void;
}) {
  const [step, setStep] = useState(0),
    [stop, setStop] = useState(3),
    [line, setLine] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const states =
    q.competencyId === 'values'
      ? [
          'Initialize the counter',
          'Process the zero reading',
          'Process the second reading',
          'Process the final reading',
          'Inspect the resulting state',
        ]
      : [
          'Start the first invocation',
          'Inspect the sentinel guard',
          'Append in the first invocation',
          'Start the second invocation',
          'Inspect its new local state',
          'Predict the returned length',
        ];
  if (!q.interaction) return null;
  return (
    <section aria-label="Explore the task state" className={styles.manipulation}>
      <p className={styles.interactionLabel}>YOUR THINKING SPACE · explore, then submit</p>
      {q.interaction === 'state-cards' ? (
        <>
          <h2>Trace one transition at a time</h2>
          <p role="status">
            State card {step + 1} · Inspect the next statement and keep a paper prediction of the
            variables.
          </p>
          <div className={styles.stateTrack} aria-hidden="true">
            {states.map((_, i) => (
              <span key={i} data-active={i === step} data-visited={i < step} />
            ))}
          </div>
          <pre className={styles.stateCard} key={step}>
            <span>TRANSITION {step + 1}</span>
            {states[step]}
          </pre>
          <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Previous statement
          </button>{' '}
          <button
            type="button"
            disabled={step >= states.length - 1}
            onClick={() => setStep(step + 1)}
          >
            Next statement
          </button>
          <label>
            Predicted state at this transition
            <input
              value={notes[step] ?? ''}
              onChange={(e) => setNotes({ ...notes, [step]: e.target.value })}
            />
          </label>
          <p>
            Repeated loop iterations revisit the body. These cards follow source lines, not an
            executing interpreter.
          </p>
        </>
      ) : q.interaction === 'loop-boundary' ? (
        <>
          <h2>Explore an exclusive boundary</h2>
          <div className={styles.boundaryDial} aria-hidden="true">
            <span key={stop}>{stop}</span>
            <small>YOUR CANDIDATE STOP</small>
            <div style={{ transform: `rotate(${stop * 40 - 140}deg)` }} />
          </div>
          <label>
            Candidate stop{' '}
            <input
              type="range"
              min={0}
              max={7}
              value={stop}
              onChange={(e) => {
                setStop(Number(e.target.value));
                onDraft(e.target.value);
              }}
            />
            <input
              aria-label="Candidate stop as a number"
              type="number"
              min={0}
              max={7}
              value={stop}
              onChange={(e) => {
                const value = Math.max(0, Math.min(7, Number(e.target.value)));
                setStop(value);
                onDraft(String(value));
              }}
            />
          </label>
          <p role="status">
            Candidate stop: {stop}. Predict the visited indices; moving the control updates your
            answer.
          </p>
        </>
      ) : (
        <>
          <h2>Localize the suspect operation</h2>
          {q.code?.split('\n').map((text, i) => (
            <label key={i} className={line === i + 1 ? styles.selectedLine : styles.inspectLine}>
              <input
                type="radio"
                name={`locate-${q.id}`}
                checked={line === i + 1}
                onChange={() => {
                  setLine(i + 1);
                  onDraft(String(i + 1));
                }}
              />
              <code>{text}</code>
            </label>
          ))}
          <p role="status">
            {line === null
              ? 'Choose a line to inspect.'
              : `Inspecting line ${line}; explain its effect before entering the line number below.`}
          </p>
        </>
      )}
    </section>
  );
}
