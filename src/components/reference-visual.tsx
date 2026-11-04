'use client';
import type { PublicStep } from '@/lib/learning-studio/types';
import styles from './interactive-lesson-studio.module.css';
export function ReferenceVisual({
  frames,
  index,
  onChange,
}: {
  frames: NonNullable<PublicStep['referenceFrames']>;
  index: number;
  onChange: (index: number) => void;
}) {
  const frame = frames[index];
  return (
    <section className={styles.reference} aria-label="Variable reference workspace">
      <div className={styles.referenceTop}>
        <span>REFERENCE MAP</span>
        <span>
          Statement {index + 1} / {frames.length}
        </span>
      </div>
      <pre>
        <code>{frame.statement}</code>
      </pre>
      <div className={styles.referenceGrid}>
        <div>
          <h3>Names</h3>
          {frame.names.map((n) => (
            <div className={styles.binding} key={n.name}>
              <code>{n.name}</code>
              <span aria-hidden="true">→</span>
              <span>object {n.objectId}</span>
            </div>
          ))}
        </div>
        <div>
          <h3>Objects</h3>
          {frame.objects.map((o) => (
            <div className={styles.objectCard} key={o.id}>
              <div>
                <b>Object {o.id}</b>
                <span>{o.mutable ? 'Mutable' : 'Immutable'}</span>
              </div>
              <code>{o.value}</code>
            </div>
          ))}
        </div>
      </div>
      <p role="status" aria-live="polite">
        {frame.explanation}
      </p>
      {frames.length > 1 && (
        <div className={styles.referenceControls}>
          <button type="button" disabled={index === 0} onClick={() => onChange(index - 1)}>
            Previous statement
          </button>
          <button
            type="button"
            disabled={index === frames.length - 1}
            onClick={() => onChange(index + 1)}
          >
            Next statement
          </button>
        </div>
      )}
    </section>
  );
}
