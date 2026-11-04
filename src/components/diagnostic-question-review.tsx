'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { QuestionReview, Report } from '@/lib/diagnostic/types';
import styles from './diagnostic.module.css';
import { DiagnosticOption } from './diagnostic-option';

export function DiagnosticScore({ report }: { report: Report }) {
  const correct = report.evidence.filter((e) => e.correct).length;
  const assistedCorrect = report.evidence.filter((e) => e.correct && e.assisted).length;
  const classified = report.evidence.some((e) => e.outcome !== undefined);
  const unsureCount = report.evidence.filter((e) => e.outcome === 'unsure').length;
  return (
    <section className={styles.scoreSummary} aria-label="Final answer count">
      <div>
        <span>CORRECT ANSWERS</span>
        <p>
          <strong>{correct}</strong>
          <b> / {report.answered}</b> correct
        </p>
      </div>
      <div className={styles.scoreCounts}>
        <span>
          {classified
            ? `${report.answered - correct - unsureCount} wrong · ${unsureCount} unsure`
            : `${report.answered - correct} wrong or unsure`}
        </span>
        <span>{assistedCorrect} correct with a hint</span>
      </div>
      <a href="#diagnostic-question-review">Go to question review</a>
      <p className={styles.note}>
        This counts your saved answers, including assisted answers. Assisted answers do not count as
        independent proficiency.
      </p>
    </section>
  );
}

export function DiagnosticQuestionReview({ entries }: { entries: QuestionReview[] }) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousIndex = useRef(index);
  useEffect(() => {
    if (previousIndex.current !== index) heading.current?.focus();
    previousIndex.current = index;
  }, [index]);
  if (!entries.length) return <p>No question evidence is available in this saved report.</p>;
  const item = entries[index],
    q = item.question,
    answer = item.answer;
  const unsure = answer?.text?.toLowerCase() === 'unsure';
  const code = q?.code?.replace(
    /\{\{([A-Za-z0-9-]+)\}\}/g,
    (_, id: string) => `[Blank ${(q.codeSlots?.findIndex((s) => s.id === id) ?? -1) + 1}]`,
  );
  const assembled =
    item.submittedCode ??
    (q?.codeSlots && answer?.blocks
      ? q.code?.replace(
          /\{\{([A-Za-z0-9-]+)\}\}/g,
          (_, id: string) =>
            q.codeSlots!.find((s) => s.id === id)?.choices.find((c) => c.id === answer.blocks?.[id])
              ?.code ?? '[unfilled]',
        )
      : undefined);
  return (
    <div className={styles.questionReview}>
      <p>
        Open any question to see its full prompt, your saved answer, the correct answer and its
        result. These answers cannot be edited.
      </p>
      <nav className={styles.reviewGrid} aria-label="Choose a question to review">
        {entries.map((e, i) => (
          <button
            type="button"
            key={e.questionId}
            aria-label={`Review question ${i + 1}: ${e.title}`}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
            data-result={e.outcome === 'unsure' ? 'unsure' : e.correct ? 'correct' : 'wrong'}
          >
            <b>{i + 1}</b>
            <span>{e.outcome === 'unsure' ? 'Unsure' : e.correct ? 'Correct' : 'Wrong'}</span>
          </button>
        ))}
      </nav>
      <div className={styles.reviewNavigation}>
        <button
          type="button"
          aria-label="Previous review question"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span role="status">
          Question {index + 1} of {entries.length}
        </span>
        <button
          type="button"
          aria-label="Next review question"
          disabled={index === entries.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
      <article className={styles.reviewQuestion} key={item.questionId}>
        <div className={styles.reviewResult}>
          <span
            data-result={item.outcome === 'unsure' ? 'unsure' : item.correct ? 'correct' : 'wrong'}
          >
            {item.outcome === 'unsure' ? 'Unsure' : item.correct ? 'Correct' : 'Wrong'}
          </span>
          <small>{item.assisted ? 'Assisted · process hint used' : 'Unaided'}</small>
        </div>
        <h3 ref={heading} tabIndex={-1}>
          {index + 1}. {item.title}
        </h3>
        <h4>Question</h4>
        <p>{q?.prompt ?? 'The original prompt is unavailable in this saved snapshot.'}</p>
        {code && (
          <pre className={styles.reportCode} aria-label="Question code">
            <code>{code}</code>
          </pre>
        )}
        {q?.options && (
          <>
            <h4>Answer options</h4>
            <ol className={styles.reviewChoices}>
              {q.options.map((option, i) => (
                <li
                  key={i}
                  data-selected={answer?.selected === i}
                  data-expected={
                    item.correctAnswer?.kind === 'option' && item.correctAnswer.index === i
                  }
                >
                  <DiagnosticOption text={option} />
                  <span className={styles.reviewChoiceTags}>
                    {answer?.selected === i && <b>Your selection</b>}
                    {item.correctAnswer?.kind === 'option' && item.correctAnswer.index === i && (
                      <b>Correct option</b>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
        {q?.steps && (
          <>
            <h4>Steps in the question</h4>
            <ul>
              {q.steps.map((s) => (
                <li key={s.id}>{s.text}</li>
              ))}
            </ul>
          </>
        )}
        {q?.codeSlots && (
          <>
            <h4>Available code blocks</h4>
            {q.codeSlots.map((slot, i) => (
              <div key={slot.id} className={styles.reviewSlot}>
                <p>
                  Blank {i + 1}: {slot.label}
                </p>
                <ul className={styles.reviewChoices}>
                  {slot.choices.map((choice) => (
                    <li
                      key={choice.id}
                      data-selected={answer?.blocks?.[slot.id] === choice.id}
                      data-expected={
                        item.correctAnswer?.kind === 'blocks' &&
                        item.correctAnswer.blocks.some(
                          (b) => b.slotId === slot.id && b.choiceId === choice.id,
                        )
                      }
                    >
                      <code>{choice.code}</code>
                      <span className={styles.reviewChoiceTags}>
                        {answer?.blocks?.[slot.id] === choice.id && <b>Your selection</b>}
                        {item.correctAnswer?.kind === 'blocks' &&
                          item.correctAnswer.blocks.some(
                            (b) => b.slotId === slot.id && b.choiceId === choice.id,
                          ) && <b>Correct block</b>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
        <section className={styles.savedAnswer} aria-label="Your saved answer">
          <h4>Your selected answer</h4>
          {!answer ? (
            <p>The saved answer is unavailable. The recorded result above has been preserved.</p>
          ) : unsure ? (
            <p>Unsure</p>
          ) : q?.codeSlots ? (
            <>
              <dl>
                {q.codeSlots.map((slot, i) => (
                  <div key={slot.id}>
                    <dt>
                      Blank {i + 1}: {slot.label}
                    </dt>
                    <dd>
                      <code>
                        {slot.choices.find((c) => c.id === answer.blocks?.[slot.id])?.code ??
                          'No block selected'}
                      </code>
                    </dd>
                  </div>
                ))}
              </dl>
              {assembled && (
                <pre className={styles.reportCode} aria-label="Your submitted code">
                  <code>{assembled}</code>
                </pre>
              )}
              <p className={styles.note}>The result applies to the complete answer.</p>
            </>
          ) : answer.blocks ? (
            <p>
              The block selections are preserved, but their original code text is unavailable in
              this snapshot.
            </p>
          ) : answer.order ? (
            <ol aria-label="Your selected step order">
              {answer.order.map((id, i) => (
                <li key={i}>
                  {q?.steps?.find((s) => s.id === id)?.text ?? 'Saved step ' + (i + 1)}
                </li>
              ))}
            </ol>
          ) : answer.selected !== undefined ? (
            <DiagnosticOption
              text={q?.options?.[answer.selected] ?? `Saved option ${answer.selected + 1}`}
            />
          ) : (
            <pre className={styles.answerText}>{answer.text ?? 'No answer was recorded.'}</pre>
          )}
        </section>
        <section className={styles.correctAnswer} aria-label="Correct answer">
          <h4>Correct answer</h4>
          {!item.correctAnswer ? (
            <p>The authored answer is unavailable in this saved snapshot.</p>
          ) : item.correctAnswer.kind === 'option' ? (
            <div>
              <p>Option {item.correctAnswer.index + 1}:</p>
              <DiagnosticOption text={item.correctAnswer.text} />
            </div>
          ) : item.correctAnswer.kind === 'ordering' ? (
            <ol aria-label="Correct step order">
              {item.correctAnswer.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : item.correctAnswer.kind === 'blocks' ? (
            <>
              <dl>
                {item.correctAnswer.blocks.map((block, i) => (
                  <div key={block.slotId}>
                    <dt>
                      Blank {i + 1}: {block.label}
                    </dt>
                    <dd>
                      <code>{block.code}</code>
                    </dd>
                  </div>
                ))}
              </dl>
              <pre className={styles.reportCode} aria-label="Correct completed code">
                <code>{item.correctAnswer.code}</code>
              </pre>
            </>
          ) : (
            <>
              <p>Accepted authored answers:</p>
              <ul className={styles.acceptedAnswers}>
                {item.correctAnswer.accepted.map((value) => (
                  <li key={value}>
                    <code>{value}</code>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <h4>Explanation</h4>
        <p>{item.explanation}</p>
        {item.misconception && (
          <small>
            Possible misconception: {item.misconception}. This is a hypothesis, not a diagnosis.
          </small>
        )}
      </article>
    </div>
  );
}
