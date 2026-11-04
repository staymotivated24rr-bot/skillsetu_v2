/** Strict decimal strings: no binary floats, exponent syntax or implicit rounding. */
function canonical(value: string): string {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  const result =
    (whole.replace(/^0+(?=\d)/, '') || '0') +
    (fraction.replace(/0+$/, '') ? '.' + fraction.replace(/0+$/, '') : '');
  return negative && result !== '0' ? '-' + result : result;
}
export function numericFormatError(
  format: { kind: 'integer' | 'float'; places: number },
  raw: string,
): string | null {
  const { kind, places } = format;
  if (
    !Number.isInteger(places) ||
    places < 0 ||
    places > 4 ||
    (kind === 'integer' ? places !== 0 : places < 1)
  )
    throw new Error('Invalid numeric metadata.');
  const pattern = kind === 'integer' ? /^[+-]?\d+$/ : new RegExp(`^[+-]?\\d+\\.\\d{${places}}$`);
  return pattern.test(raw.trim())
    ? null
    : kind === 'integer'
      ? 'Enter an integer with no decimal point.'
      : `Enter a float with exactly ${places} ${places === 1 ? 'digit' : 'digits'} after the decimal point.`;
}
export function numericResult(
  format: { kind: 'integer' | 'float'; places: number; expected: string },
  raw: string,
): { format: boolean; correct: boolean; message: string } {
  const error = numericFormatError(format, raw);
  return {
    format: !error,
    correct: !error && canonical(raw.trim()) === canonical(format.expected),
    message: error ?? '',
  };
}
