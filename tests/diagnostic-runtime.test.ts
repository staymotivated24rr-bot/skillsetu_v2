import { expect, it } from 'vitest';
import { diagnosticDevelopmentEnv } from '../scripts/dev-diagnostic.mjs';

it('uses the explicit diagnostic store rather than an inherited unrelated connection', () => {
  const env = diagnosticDevelopmentEnv(
    { DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:15432/diagnostic_fixture' },
    { NODE_ENV: 'development', DATABASE_URL: 'postgresql://unused:unused@remote.invalid/other' },
  );
  expect(env.DATABASE_URL).toContain('/diagnostic_fixture');
  expect(env.DIAGNOSTIC_STARTER_V3_DEFAULT).toBe('true');
  expect(env.DIAGNOSTIC_DRAFT_ENV).toBe('local');
});
it.each(['postgresql://unused:unused@remote.invalid/db', 'file:local.db', 'not-a-url'])(
  'refuses unsafe or invalid diagnostic development storage: %s',
  (DATABASE_URL) => {
    expect(() => diagnosticDevelopmentEnv({ DATABASE_URL }, { NODE_ENV: 'development' })).toThrow();
  },
);
it('never enables a hosted draft through the development command', () => {
  expect(() =>
    diagnosticDevelopmentEnv(
      { DATABASE_URL: 'postgresql://unused:unused@127.0.0.1/local' },
      { NODE_ENV: 'development', VERCEL: '1' },
    ),
  ).toThrow();
});
