export type Contract = { kind: 'python-fragment'; examples: string[] };
// A bounded lexer for this bank's constrained fragments, not a Python interpreter.
// Complete token streams must match. No identifier case-folding or substring credit.
export function pythonTokens(input: string): string[] | null {
  if (input.length > 1000) return null;
  const out: string[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let value = '';
      let closed = false;
      i++;
      while (i < input.length) {
        const ch = input[i++];
        if (ch === quote) {
          closed = true;
          break;
        }
        if (ch === '\\') {
          const escaped = input[i++];
          if (escaped === quote || escaped === '\\') value += escaped;
          else if (escaped === 'n') value += '\n';
          else if (escaped === 't') value += '\t';
          else return null;
        } else value += ch;
      }
      if (!closed) return null;
      out.push('str:' + JSON.stringify(value));
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z_0-9]*/.exec(input.slice(i));
    if (name) {
      out.push('name:' + name[0]);
      i += name[0].length;
      continue;
    }
    const number = /^(?:0|[1-9][0-9]*)(?![0-9])/.exec(input.slice(i));
    if (number) {
      out.push('int:' + number[0]);
      i += number[0].length;
      continue;
    }
    const op = /^(?:==|!=|<=|>=|[().,<>=+*:\-])/.exec(input.slice(i));
    if (op) {
      out.push(op[0]);
      i += op[0].length;
      continue;
    }
    return null;
  }
  // Parenthesis balance is necessary even for a near-match. Trailing commas are
  // accepted only in call argument lists, not by removing arbitrary punctuation.
  let depth = 0;
  for (const token of out) {
    if (token === '(') depth++;
    if (token === ')' && --depth < 0) return null;
  }
  if (depth) return null;
  return out;
}
export function matchesContract(text: string, examples: string[]): boolean {
  const tokens = pythonTokens(text);
  if (!tokens) return false;
  return examples.some(
    (example) => JSON.stringify(pythonTokens(example)) === JSON.stringify(tokens),
  );
}
