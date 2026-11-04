'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SavedLearningRecommendation } from '@/lib/learning-studio/selector-types';
import styles from './diagnostic-learning-pathway.module.css';
export function DiagnosticLearningPathway({ sourceRunId }: { sourceRunId: string }) {
  const [data, setData] = useState<SavedLearningRecommendation>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/diagnostic-v2/learning?recommendation=${encodeURIComponent(sourceRunId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Could not load your concept path.');
        setData(result);
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [sourceRunId, retry]);
  const map = data?.recommendation.learningMap;
  return (
    <section className={styles.pathway} aria-labelledby="personal-pathway">
      <p className="eyebrow">YOUR CONCEPT PATH</p>
      <h2 id="personal-pathway">Your personalized learning pathway</h2>
      <p>
        Choose a focused activity. Preparation links describe useful connections; they do not lock
        lessons or change assessed proficiency.
      </p>
      {error ? (
        <p role="alert">
          {error} <button onClick={() => setRetry((n) => n + 1)}>Retry pathway</button>
        </p>
      ) : !data ? (
        <p role="status">Loading your learning pathway…</p>
      ) : (
        <>
          <ol className={styles.conceptPath}>
            {map?.map((node, index) => (
              <li key={node.id} data-recommended={node.recommended}>
                <span className={styles.node} aria-hidden="true">
                  {node.completed ? '✓' : String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className={styles.tag}>
                    {node.recommended
                      ? 'Recommended next'
                      : node.completed
                        ? 'Completed activity · optional review'
                        : 'Optional concept enrichment'}
                  </p>
                  <h3>{node.title}</h3>
                  {node.prerequisites.length > 0 && (
                    <p className={styles.meta}>
                      Suggested preparation: {node.prerequisites.join(' → ')}
                    </p>
                  )}
                  {node.progress && (
                    <p>
                      {node.progress}
                      {node.completed
                        ? ' · Completion is not proof of independent mastery.'
                        : ' · In progress'}
                    </p>
                  )}
                  <Link
                    className={node.recommended ? styles.launch : styles.optional}
                    href={node.href}
                  >
                    {node.recommended
                      ? 'Open recommended activity'
                      : node.completed
                        ? 'Review activity'
                        : 'Explore activity'}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          {!map && (
            <p>
              This saved guidance uses an earlier mapping.{' '}
              <Link href="/diagnostic-v2/learn/variables">Open optional variables practice</Link>.
            </p>
          )}
          <p className={styles.meta}>
            Four authored activities are available in this development preview; this path does not
            claim complete coverage of eight competencies.
          </p>
        </>
      )}
    </section>
  );
}
