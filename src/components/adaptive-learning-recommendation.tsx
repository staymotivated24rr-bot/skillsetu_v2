'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { SavedLearningRecommendation } from '@/lib/learning-studio/selector-types';
import styles from './diagnostic-learning-pathway.module.css';
export function AdaptiveLearningRecommendation({
  sourceRunId,
  decisionId,
}: {
  sourceRunId: string;
  decisionId?: string;
}) {
  const [data, setData] = useState<SavedLearningRecommendation>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (save = false) => {
      const response = await fetch(
        '/api/diagnostic-v2/learning' +
          (save
            ? ''
            : `?recommendation=${encodeURIComponent(sourceRunId)}${decisionId ? '&decision=' + encodeURIComponent(decisionId) : ''}`),
        {
          method: save ? 'POST' : 'GET',
          cache: 'no-store',
          headers: save ? { 'Content-Type': 'application/json' } : undefined,
          body: save ? JSON.stringify({ action: 'learning-select', sourceRunId }) : undefined,
          signal: AbortSignal.timeout(20000),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not load learning guidance.');
      return result as SavedLearningRecommendation;
    },
    [sourceRunId, decisionId],
  );
  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (active) {
          setData(result);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [load]);
  async function refresh(save: boolean) {
    setBusy(true);
    setError('');
    try {
      setData(await load(save));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Guidance unavailable.');
    } finally {
      setBusy(false);
    }
  }
  const result = data?.recommendation;
  return (
    <section
      className={styles.pathway}
      aria-label="Adaptive learning and revision"
      aria-busy={busy}
    >
      <p className="eyebrow">YOUR NEXT ACTIVITY</p>
      <h2>Your next concept and revision</h2>
      {error && <p role="alert">{error}</p>}
      {!result ? (
        <p role="status">Loading owned learning evidence…</p>
      ) : (
        <>
          <p className={styles.tag}>
            {result.category
              ? {
                  remediation: 'Required remediation',
                  verification: 'Targeted evidence verification',
                  advanced: 'Advanced challenge',
                  enrichment: 'Optional concept enrichment',
                  continue: 'Continue unfinished lesson',
                }[result.category]
              : 'Saved earlier guidance'}
          </p>
          <h3>{result.concept.name}</h3>
          {result.concept.subskill && (
            <p>
              Focus: <strong>{result.concept.subskill}</strong>
            </p>
          )}
          <p>{result.reason}</p>
          {result.action.href && (
            <Link className={styles.launch} href={result.action.href}>
              {result.action.label}
            </Link>
          )}
          <details>
            <summary>Why this activity? Evidence and review policy</summary>{' '}
            <p>
              Diagnostic evidence: {result.diagnosticEvidence}. Practice mastery:{' '}
              <strong>{result.practice.status}</strong>. Review status:{' '}
              <strong>{result.review.status}</strong>
              {result.review.dueDay ? ` · due ${result.review.dueDay}` : ''}.
            </p>
            <p>
              Suggested challenge difficulty: <strong>{result.suggestedDifficulty} / 3</strong> —{' '}
              {result.difficultyReason} This is advisory; existing lesson difficulty and diagnostic
              selection are unchanged.
            </p>
            <p>{result.variant.reason}</p>
            <p>{result.action.coverage}</p>
            <p>{result.practice.reason}</p>
            <p>{result.review.reason}</p>
            <p>
              Completed steps: {result.practice.completedSteps}/{result.practice.totalSteps}; first
              unaided matches: {result.practice.firstUnaidedMatches}; hint uses:{' '}
              {result.practice.hintUses}; repeated easy matches excluded:{' '}
              {result.practice.repeatedEasyMatches}.
            </p>
            {result.evidence.prerequisiteSupport.map((text) => (
              <p key={text}>{text}</p>
            ))}
            <p>
              As of {result.asOfDay}; calendar timezone {result.schedulingTimezone}. Policy{' '}
              {result.selectorVersion}. Heuristic learning guidance, not calibrated psychometrics or
              an assessed proficiency change.
            </p>
          </details>
          <details>
            <summary>Save or revisit this guidance</summary>
            <p>
              {data?.saved
                ? 'This recommendation is saved as an immutable evidence snapshot.'
                : 'This live recommendation is derived from saved practice. Save it to keep this decision for review.'}
            </p>
            {data?.decisionId && (
              <p>
                <Link
                  href={`/diagnostic-v2/learn/revision?source=${encodeURIComponent(sourceRunId)}&decision=${encodeURIComponent(data.decisionId)}`}
                >
                  Bookmark this learning decision
                </Link>
              </p>
            )}
          </details>
          {!!result.continueLearning?.length && (
            <section aria-label="Continue learning">
              <h3>Continue learning</h3>
              <p>Unfinished activities, separate from your diagnostic findings.</p>
              <ul className={styles.items}>
                {result.continueLearning.map((item) => (
                  <li key={item.runId}>
                    <Link href={item.href}>{item.title}</Link>
                    <p>
                      {item.completed}/{item.total} steps completed
                      {item.currentStep ? ` · Next: ${item.currentStep}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {!decisionId && (
        <p className={styles.controls}>
          <button disabled={busy} onClick={() => void refresh(false)}>
            Refresh from saved practice
          </button>{' '}
          <button disabled={busy || !result} onClick={() => void refresh(true)}>
            Save learning recommendation
          </button>
        </p>
      )}
      {decisionId && (
        <p>
          <Link href={`/diagnostic-v2/learn/revision?source=${encodeURIComponent(sourceRunId)}`}>
            See current learning guidance
          </Link>
        </p>
      )}
      <details>
        <summary>How learning relates to your diagnostic</summary>
        <p>
          Lesson completion, XP and repeated easy answers never increase your diagnostic score. This
          selector uses its own conservative practice-evidence policy; earlier lesson mastery
          receipts remain unchanged. Only this diagnostic session’s V2 practice is used; the legacy
          demo identity is not linked.
        </p>
      </details>
    </section>
  );
}
