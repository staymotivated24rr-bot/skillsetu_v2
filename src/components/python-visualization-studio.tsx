'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicPythonTrace, TraceKind } from '@/lib/learning-studio/trace-types';
import { PythonTraceVisualizer, traceRequest } from './python-trace-visualizer';
import { LearningCompanion } from './learning-companion';
import styles from './interactive-lesson-studio.module.css';
export type TraceSummary = { id: string; title: string; kind: TraceKind };
export function PythonVisualizationStudio({ catalog }: { catalog: TraceSummary[] }) {
  const [session, setSession] = useState(false),
    [ready, setReady] = useState(false);
  const [name, setName] = useState(''),
    [error, setError] = useState('');
  const [selected, setSelected] = useState(catalog[0].id);
  const [trace, setTrace] = useState<PublicPythonTrace>(),
    [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/diagnostic-v2/learning', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setSession(!!result.session);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    traceRequest({ action: 'trace-open', traceId: selected }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setTrace(result.trace);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session, selected, reload]);
  async function enter(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/diagnostic-v2/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enter', name: name.trim() }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSession(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enter the learning studio.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="product-app">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/diagnostic-v2/learn/variables">
            SkillSetu <span>THE LEARNING STUDIO</span>
          </Link>
          <LearningCompanion compact />
        </header>
        <main id="main-content">
          <p className="eyebrow">PYTHON · SEE THE STATE CHANGE</p>
          <h1>Make the invisible visible.</h1>
          <p className={styles.intro}>
            Four original, step-through workspaces. Predict a change, inspect the state, then
            explain it.
          </p>
          <p className={styles.sessionNote}>
            Local instructional preview. These are authored simulations, not live Python execution.
            Your diagnostic session stays separate from the demo identity. Exploration state resets
            on refresh; no assessment or mastery records are written.
          </p>
          {!ready ? (
            <p role="status">Checking your learning session…</p>
          ) : !session ? (
            <form onSubmit={(event) => void enter(event)} className={styles.card}>
              <label>
                Your visualization practice name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  required
                />
              </label>
              <button type="submit" disabled={loading || !name.trim()}>
                Open visualization studio
              </button>
            </form>
          ) : (
            <>
              <label htmlFor="trace-kind">Choose a visualization</label>
              <select
                id="trace-kind"
                value={selected}
                onChange={(event) => {
                  if (event.target.value === selected) return;
                  setError('');
                  setLoading(true);
                  setTrace(undefined);
                  setSelected(event.target.value);
                }}
              >
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              {(loading || (session && !trace && !error)) && (
                <p role="status">Loading the authored trace…</p>
              )}
              {trace && trace.id === selected && (
                <PythonTraceVisualizer key={`${trace.id}@${trace.version}`} trace={trace} />
              )}
            </>
          )}
          {error && (
            <p role="alert">
              {error}{' '}
              {session && (
                <button
                  onClick={() => {
                    setError('');
                    setLoading(true);
                    setTrace(undefined);
                    setReload((n) => n + 1);
                  }}
                >
                  Retry trace
                </button>
              )}{' '}
              <Link href="/diagnostic-v2">Return to your diagnostic session</Link>.
            </p>
          )}
          <p>
            <Link href="/diagnostic-v2/learn/variables">Continue the full variables lesson</Link> ·{' '}
            <Link href="/diagnostic-v2/learn/studio">Open guided Python practice</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
