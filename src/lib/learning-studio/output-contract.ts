import { pythonTokens } from '../diagnostic/contracts';
// Bounded literal/output comparison only. Never eval, execute, or parse arbitrary Python.
function literalTokens(text: string): string[] | null {
  if (text.length > 1000) return null;
  const tokens: string[] = [];
  let position = 0;
  while (position < text.length) {
    const rest = text.slice(position);
    const token =
      /^(?:\s+|"(?:[^"\\\r\n]|\\["\\nt])*"|'(?:[^'\\\r\n]|\\['\\nt])*'|[+-]?(?:0|[1-9][0-9]*)(?![0-9])|True\b|False\b|None\b|[\[\],])/.exec(
        rest,
      )?.[0];
    if (!token) return null;
    position += token.length;
    if (/^\s+$/.test(token)) continue;
    if (token.startsWith('"') || token.startsWith("'")) {
      const parsed = pythonTokens(token);
      if (!parsed) return null;
      tokens.push(parsed[0]);
    } else tokens.push(token);
  }
  let cursor = 0;
  function value(): boolean {
    const token = tokens[cursor++];
    if (token === '[') {
      if (tokens[cursor] === ']') {
        cursor++;
        return true;
      }
      do {
        if (!value()) return false;
        if (tokens[cursor] === ']') {
          cursor++;
          return true;
        }
        if (tokens[cursor++] !== ',') return false;
        if (tokens[cursor] === ']') {
          cursor++;
          return true;
        }
      } while (cursor < tokens.length);
      return false;
    }
    return (
      !!token &&
      (token.startsWith('str:') ||
        /^[+-]?\d+$/.test(token) ||
        ['True', 'False', 'None'].includes(token))
    );
  }
  if (!value() || cursor !== tokens.length) return null;
  return tokens.filter((t, i) => !(t === ',' && tokens[i + 1] === ']'));
}
export function outputMatches(actual: string, expected: string, format: 'literal' | 'plain') {
  if (format === 'plain') return actual.replace(/\r\n/g, '\n').replace(/\n$/, '') === expected;
  const a = literalTokens(actual),
    b = literalTokens(expected);
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
}
