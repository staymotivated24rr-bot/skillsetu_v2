'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import type { Answer, PublicQuestion } from '@/lib/diagnostic/types';
import styles from './diagnostic.module.css';

export function CodeBlockComposer({
  question: q,
  answer,
  onChange,
  disabled,
  instruction = 'Click or tap a blank, then choose a block. Tab and Enter also work. Results are shown at the end.',
}: {
  question: Pick<PublicQuestion, 'id' | 'code' | 'codeSlots'>;
  answer: Answer;
  onChange: (answer: Answer) => void;
  disabled: boolean;
  instruction?: string;
}) {
  const slots = q.codeSlots!;
  const [activeId, setActiveId] = useState(
    () => slots.find((s) => !answer.blocks?.[s.id])?.id ?? slots[0].id,
  );
  const index = Math.max(
    0,
    slots.findIndex((s) => s.id === activeId),
  );
  const active = slots[index];
  const filled = slots.filter((s) => s.choices.some((c) => c.id === answer.blocks?.[s.id])).length;
  function clear() {
    const blocks = { ...answer.blocks };
    delete blocks[active.id];
    onChange({ blocks });
  }
  return (
    <div className={styles.blockComposer}>
      <div className={styles.blockEditor}>
        <div className={styles.blockEditorBar}>
          <span>
            <span className={styles.codeDot} /> Python
          </span>
          <span>Choose blocks · no code execution</span>
        </div>
        <pre aria-label="Code with selectable blanks">
          <code>
            {q.code!.split('\n').map((line, lineIndex) => (
              <span className={styles.blockCodeLine} key={lineIndex}>
                <span className={styles.lineNumber} aria-hidden="true">
                  {lineIndex + 1}
                </span>
                {line.split(/(\{\{[A-Za-z0-9-]+\}\})/g).map((part, j) => {
                  const slot = slots.find((s) => part === `{{${s.id}}}`);
                  if (!slot) return <span key={j}>{part}</span>;
                  const slotIndex = slots.indexOf(slot);
                  const choice = slot.choices.find((c) => c.id === answer.blocks?.[slot.id]);
                  return (
                    <button
                      type="button"
                      key={j}
                      className={styles.codeBlank}
                      data-active={slot.id === active.id}
                      aria-label={`Blank ${slotIndex + 1}: ${slot.label}. ${choice ? 'Selected: ' + choice.code : 'Empty'}`}
                      aria-pressed={slot.id === active.id}
                      aria-controls={`palette-${q.id}`}
                      disabled={disabled}
                      onClick={() => setActiveId(slot.id)}
                    >
                      <span className={styles.blankIndex} aria-hidden="true">
                        {slotIndex + 1}
                      </span>
                      {choice?.code ?? 'Choose a block'}
                    </button>
                  );
                })}
              </span>
            ))}
          </code>
        </pre>
        <div className={styles.blockToolbar}>
          <div>
            <button
              type="button"
              aria-label="Previous blank"
              disabled={disabled || index === 0}
              onClick={() => setActiveId(slots[index - 1].id)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Blank {index + 1} of {slots.length}
            </span>
            <button
              type="button"
              aria-label="Next blank"
              disabled={disabled || index === slots.length - 1}
              onClick={() => setActiveId(slots[index + 1].id)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <button type="button" disabled={disabled || !answer.blocks?.[active.id]} onClick={clear}>
            <X size={14} /> Clear blank
          </button>
        </div>
      </div>
      <section
        className={styles.blockPalette}
        id={`palette-${q.id}`}
        aria-label={`Code blocks for ${active.label}`}
      >
        <div className={styles.paletteHeading}>
          <span>CHOOSE A BLOCK</span>
          <b>{active.label}</b>
        </div>
        <div className={styles.blockChoices}>
          {active.choices.map((choice) => (
            <button
              type="button"
              key={choice.id}
              disabled={disabled}
              aria-pressed={answer.blocks?.[active.id] === choice.id}
              onClick={() => onChange({ blocks: { ...answer.blocks, [active.id]: choice.id } })}
            >
              <code>{choice.code}</code>
            </button>
          ))}
        </div>
      </section>
      <div className={styles.blockFooter}>
        <span role="status">
          {filled} of {slots.length} blanks filled
        </span>
        <button
          type="button"
          disabled={disabled || (!answer.text && !filled)}
          onClick={() => {
            onChange({ blocks: {} });
            setActiveId(slots[0].id);
          }}
        >
          <RotateCcw size={14} /> Start over
        </button>
      </div>
      <p className={styles.note}>
        {instruction}
      </p>
    </div>
  );
}
