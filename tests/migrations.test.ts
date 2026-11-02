import { beforeAll, afterAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { db } from '../src/lib/db';

function migrateAndSeed() {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], {
    env: process.env,
    stdio: 'pipe',
  });
}

beforeAll(() => migrateAndSeed());
afterAll(() => db.$disconnect());

it('applies PostgreSQL migrations and seed repeatably without losing learner history', async () => {
  const id = 'migration-preservation-check';
  await db.user.upsert({
    where: { id },
    create: { id, name: 'Existing learner', selectedRoleId: 'python-developer' },
    update: { name: 'Existing learner', selectedRoleId: 'python-developer' },
  });

  migrateAndSeed();
  migrateAndSeed();

  expect(await db.user.findUnique({ where: { id } })).toMatchObject({
    name: 'Existing learner',
    selectedRoleId: 'python-developer',
  });
  expect(await db.role.count()).toBe(3);
  expect(await db.assessment.count()).toBe(6);
  expect(await db.lesson.count()).toBe(51);
  expect(await db.cohort.count()).toBe(3);
});
