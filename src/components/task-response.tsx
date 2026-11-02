'use client';
import { useEffect, useRef, useState } from 'react';
import type { PublicTask, TaskPayload } from '@/lib/authentic/types';
type Feedback = { passed?: number; total?: number; score?: number; response?: string };
export function TaskResponse({
  task,
  storageKey,
  initial,
  busy,
  evaluate,
  onSubmit,
}: {
  task: PublicTask;
  storageKey: string;
  initial?: TaskPayload;
  busy: boolean;
  evaluate: (payload: TaskPayload) => Promise<Feedback>;
  onSubmit: (payload: TaskPayload) => Promise<void>;
}) {
  const [payload, setPayload] = useState<TaskPayload>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return (
      initial ??
      (task.starter
        ? { code: task.starter }
        : task.steps
          ? { order: task.steps.map((s) => s.id) }
          : {})
    );
  });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [payload, storageKey]);
  useEffect(
    () => () => {
      cancel.current?.();
      timers.current.forEach(clearTimeout);
      frame.current?.remove();
    },
    [],
  );
  function update(next: TaskPayload) {
    setPayload(next);
    setFeedback(null);
    setError('');
  }
  async function run() {
    cancel.current?.();
    frame.current?.remove();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStatus('Loading isolated Python runtime…');
    setError('');
    setFeedback(null);
    try {
      const response = await fetch('/api/python-sandbox');
      if (!response.ok) throw new Error('Could not load Python sandbox.');
      const documentText = await response.text();
      const outputs = await new Promise<unknown[]>((resolve, reject) => {
        const requestId = crypto.randomUUID();
        const iframe = document.createElement('iframe');
        iframe.sandbox.add('allow-scripts');
        iframe.title = 'Isolated Python execution';
        iframe.hidden = true;
        frame.current = iframe;
        const cleanup = () => {
          window.removeEventListener('message', receive);
          timers.current.forEach(clearTimeout);
          iframe.remove();
          cancel.current = null;
        };
        const fail = (message: string) => {
          cleanup();
          reject(new Error(message));
        };
        cancel.current = () => fail('Execution cancelled.');
        const receive = (event: MessageEvent) => {
          if (event.source !== iframe.contentWindow) return;
          if (event.data?.kind === 'frame-ready')
            iframe.contentWindow?.postMessage(
              {
                kind: 'run',
                requestId,
                code: payload.code,
                inputs: task.inputs,
                functionName: task.functionName,
              },
              '*',
            );
          if (event.data?.requestId !== requestId) return;
          if (event.data.kind === 'ready') {
            setStatus('Running evaluation cases…');
            timers.current.forEach(clearTimeout);
            timers.current = [
              setTimeout(
                () =>
                  fail(
                    'Execution timed out after 5 seconds. The worker was terminated; edit your code and retry.',
                  ),
                5000,
              ),
            ];
          }
          if (event.data.kind === 'error') fail(event.data.error);
          if (event.data.kind === 'result') {
            cleanup();
            resolve(event.data.outputs);
          }
        };
        window.addEventListener('message', receive);
        timers.current = [
          setTimeout(
            () => fail('Python runtime loading timed out. Check your connection and retry.'),
            60000,
          ),
        ];
        iframe.srcdoc = documentText;
        document.body.append(iframe);
      });
      const next = { code: payload.code, outputs };
      setPayload(next);
      const result = await evaluate(next);
      setFeedback(result);
      setStatus('Evaluation complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Execution failed.');
      setStatus('');
    }
  }
  const running = status.includes('Loading') || status.includes('Running');
  return (
    <div className="task-response">
      {task.starter ? (
        <>
          <div className="code-mobile-note">
            This coding task is best completed on a larger screen. Your draft is saved; you can
            return here on that screen.
          </div>
          <div className="code-toolbar">
            <span>Python · isolated worker</span>
            <button
              className="text-btn"
              disabled={busy || running}
              onClick={() => update({ code: task.starter })}
            >
              Reset
            </button>
          </div>
          <label className="sr-only" htmlFor={'code-' + task.id}>
            Python code
          </label>
          <textarea
            id={'code-' + task.id}
            className="code-editor"
            spellCheck={false}
            value={payload.code ?? ''}
            onChange={(e) => update({ code: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                update({
                  code: el.value.slice(0, start) + '    ' + el.value.slice(el.selectionEnd),
                });
                requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
              }
            }}
          />
          <div className="actions">
            <button
              className="btn btn-outline"
              disabled={busy || running}
              onClick={() => void run()}
            >
              Run Python
            </button>
            <span role="status">{status}</span>
          </div>
          {feedback && (
            <div className="run-results" role="status">
              <b>
                {feedback.passed} / {feedback.total} evaluation cases passed
              </b>
              <p>{feedback.response}</p>
              <small>
                Evaluation inputs can be inspected in your browser. Expected outputs and solution
                code are not returned. This is prototype evidence, not an anti-cheating certificate.
              </small>
            </div>
          )}
        </>
      ) : task.options ? (
        <fieldset className="options">
          <legend className="sr-only">Choose your next action</legend>
          {task.options.map((option, i) => (
            <label className={'option ' + (payload.selected === i ? 'selected' : '')} key={option}>
              <input
                type="radio"
                name={task.id}
                checked={payload.selected === i}
                onChange={() => update({ selected: i })}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ) : task.steps ? (
        <>
          <p className="small muted">
            Order the workflow using the move controls. Partial credit uses relative ordering of all
            step pairs.
          </p>
          <ol className="ordered-list">
            {(payload.order ?? []).map((id, i) => (
              <li key={id}>
                <span>{task.steps!.find((s) => s.id === id)?.text}</span>
                <div>
                  {[-1, 1].map((direction) => (
                    <button
                      key={direction}
                      className="icon-btn"
                      aria-label={`Move step ${i + 1} ${direction === -1 ? 'up' : 'down'}`}
                      disabled={busy || i + direction < 0 || i + direction >= task.steps!.length}
                      onClick={() => {
                        const order = [...(payload.order ?? [])];
                        [order[i], order[i + direction]] = [order[i + direction], order[i]];
                        update({ order });
                      }}
                    >
                      {direction === -1 ? '↑' : '↓'}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <label htmlFor={'response-' + task.id}>Your explanation</label>
          <textarea
            id={'response-' + task.id}
            className="short-answer"
            value={payload.text ?? ''}
            maxLength={4000}
            onChange={(e) => update({ text: e.target.value })}
          />
          <p className="small muted">
            Deterministic rubric-based evaluation, not AI grading. Address:{' '}
            {task.rubricDimensions?.join(' · ')}. Write 30–4,000 characters; concept matching can
            miss valid paraphrases.
          </p>
        </>
      )}
      {error && (
        <p className="task-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="btn btn-primary"
        disabled={
          busy ||
          running ||
          (task.starter
            ? !feedback
            : task.options
              ? payload.selected === undefined
              : !task.steps && !payload.text?.trim())
        }
        onClick={() => void onSubmit(payload).catch((e) => setError(e.message))}
      >
        Send response
      </button>
    </div>
  );
}
