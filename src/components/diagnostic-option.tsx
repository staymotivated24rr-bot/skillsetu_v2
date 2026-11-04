import { optionPresentation } from '@/lib/diagnostic/option-presentation';
import styles from './diagnostic.module.css';

/** Shared by active questions and immutable historical reviews. */
export function DiagnosticOption({ text }: { text: string }) {
  const display = optionPresentation(text);
  return (
    <span className={styles.optionOutput}>
      <code className={styles.optionValue} aria-hidden="true">
        {display.visible}
      </code>
      <span className={styles.srOnly}>{display.accessible}</span>
      {display.marked && (
        <small className={styles.whitespaceLegend} aria-hidden="true">
          ␠ space · ↵ line break · ⇥ tab · Unicode escapes name other hidden characters
        </small>
      )}
    </span>
  );
}
