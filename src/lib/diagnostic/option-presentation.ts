/** Display-only contract. No answer keys, execution, or changes to saved option indexes. */
export function optionPresentation(text: string) {
  const marked = /^\s|\s$| {2,}|[\t\n\r\p{Cc}\p{Cf}\p{Zl}\p{Zp}]|[^\S \n\r\t]/u.test(text);
  const visible = marked
    ? Array.from(text, (c) => {
        if (c === ' ') return '␠';
        if (c === '\n') return '↵\n';
        if (c === '\t') return '⇥';
        if (/\s|\p{Cc}|\p{Cf}/u.test(c)) return `\\u{${c.codePointAt(0)!.toString(16)}}`;
        return c;
      }).join('')
    : text;
  const accessible = marked
    ? Array.from(text, (c) => {
        if (c === ' ') return ' [space] ';
        if (c === '\n') return ' [line break] ';
        if (c === '\t') return ' [tab] ';
        if (/\s|\p{Cc}|\p{Cf}/u.test(c)) return ` [Unicode ${c.codePointAt(0)!.toString(16)}] `;
        return c;
      }).join('')
    : text;
  return { visible, accessible, marked };
}

/** A publication gate, also used by the 360-item rendered-option audit. */
export function optionPresentationIssues(options: readonly string[]): string[] {
  const normalize = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
  const issues: string[] = [];
  for (const field of ['visible', 'accessible'] as const) {
    const keys = options.map((s) => normalize(optionPresentation(s)[field]));
    if (keys.some((s) => !s) || new Set(keys).size !== keys.length)
      issues.push(`Indistinguishable ${field} options`);
  }
  return issues;
}
