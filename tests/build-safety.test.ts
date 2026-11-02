import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
it('hosted builds never apply migrations or seed even when a database variable is present', () => {
  const output = execFileSync(process.execPath, ['--import', 'tsx', 'prisma/build-setup.ts'], {
    env: {
      ...process.env,
      VERCEL: '1',
      DATABASE_URL: 'postgresql://invalid.invalid/do-not-connect',
    },
    encoding: 'utf8',
  });
  expect(output).toContain('no database writes during build');
  expect(output).not.toContain('migrate deploy');
});
