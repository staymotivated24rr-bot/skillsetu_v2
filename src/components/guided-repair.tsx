'use client';
import { useState } from 'react';
import type { RepairScenario } from '@/lib/diagnostic/starter-v3/lessons';
export function GuidedRepair({
  subskill,
  concept,
  example,
  scenario: targetedScenario,
}: {
  subskill: string;
  concept: string;
  example: string;
  scenario?: RepairScenario;
}) {
  const [stage, setStage] = useState(0),
    [prediction, setPrediction] = useState(''),
    [choice, setChoice] = useState('');
  const scenario: RepairScenario =
    targetedScenario ??
    (subskill.includes('dictionary')
      ? {
          prompt: 'An optional label is absent for order 82. What should a display helper do?',
          options: [
            'Use the authored fallback only for the absent key',
            'Replace every falsy value, including zero',
          ],
          explain: 'Absence and a present falsy value have different contracts.',
        }
      : subskill.includes('alias')
        ? {
            prompt:
              'A copied outer list contains nested records. Which object can still be shared?',
            options: ['The nested records', 'Neither outer nor nested objects can be shared'],
            explain: 'A shallow copy duplicates the outer container, not nested objects.',
          }
        : subskill.includes('default')
          ? {
              prompt:
                'Two omitted-argument calls should have independent working lists. Which contract fits?',
              options: [
                'Allocate a new list for each omitted-argument invocation',
                'Reuse one default list across invocations',
              ],
              explain:
                'Default objects are created once; a sentinel lets each invocation allocate its own state.',
            }
          : subskill.includes('type') || subskill.includes('boolean')
            ? {
                prompt:
                  'A quantity must be an integer but must reject booleans. What boundary must a test cover?',
                options: ['True alongside zero and a positive integer', 'Only a positive integer'],
                explain: 'bool is an int subclass, so a broad isinstance test can admit True.',
              }
            : subskill.includes('loop') || subskill.includes('boundary')
              ? {
                  prompt:
                    'A batch contains six rows indexed from zero. Which verification set exposes off-by-one errors?',
                  options: ['Empty, one-row and six-row batches', 'Only an arbitrary middle row'],
                  explain:
                    'Boundary sizes reveal missing first/last elements and empty-loop behavior.',
                }
              : subskill.includes('side')
                ? {
                    prompt:
                      'A helper promises to preserve the caller’s sequence. Which test checks the promise?',
                    options: [
                      'Compare the original input before and after the call',
                      'Check only that an output exists',
                    ],
                    explain: 'Output checks alone do not detect unintended mutation.',
                  }
                : {
                    prompt: 'A repair appears correct. Which next step gives independent evidence?',
                    options: [
                      'Derive an expected boundary outcome from the contract',
                      'Run the implementation twice and compare its outputs',
                    ],
                    explain:
                      'Repeated execution can repeat the same defect; expectations need an independent source.',
                  });
  return (
    <section className="studio-repair" aria-label="Guided subskill repair">
      <h2>Practice: {subskill || 'verify the contract'}</h2>
      <p role="status">Stage {stage + 1} of 3 · practice does not change diagnostic results</p>
      {stage === 0 ? (
        <>
          <p>{concept}</p>
          <label>
            Predict a boundary case and its expected outcome
            <textarea value={prediction} onChange={(e) => setPrediction(e.target.value)} rows={3} />
          </label>
          <button disabled={!prediction.trim()} onClick={() => setStage(1)}>
            Compare with the worked example
          </button>
        </>
      ) : stage === 1 ? (
        <>
          <p>{example}</p>
          <p>Your prediction: {prediction}</p>
          <fieldset>
            <legend>{scenario.prompt}</legend>
            {scenario.options.map((v) => (
              <label key={v}>
                <input
                  name="practice-check"
                  type="radio"
                  checked={choice === v}
                  onChange={() => setChoice(v)}
                />
                {v}
              </label>
            ))}
          </fieldset>
          <button disabled={!choice} onClick={() => setStage(2)}>
            Check my reasoning
          </button>
        </>
      ) : (
        <>
          <p role="status">
            {choice === scenario.options[0]
              ? scenario.explain
              : 'Revisit the contract: ' + scenario.explain}
          </p>
          <p>
            {scenario.transfer ??
              'Now write an unseen valid, empty and invalid case for this subskill. Ask a reviewer to check the expectation independently.'}
          </p>
          <button
            onClick={() => {
              setStage(0);
              setChoice('');
            }}
          >
            Try another case
          </button>
        </>
      )}
    </section>
  );
}
