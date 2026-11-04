import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const serverMode = process.argv.includes('--stable') ? 'start' : 'dev';
if (serverMode === 'start' && !existsSync(resolve('.next/BUILD_ID')))
  throw new Error('Stable preview needs a completed local build. No database setup is run automatically.');

// Explicit isolated development store. Never migrate/seed implicitly at startup.
const settings = parseEnv(readFileSync('.env.studio', 'utf8'));
const url = new URL(settings.DATABASE_URL ?? '');
if (
  process.env.VERCEL ||
  !['postgres:', 'postgresql:'].includes(url.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
  !url.pathname.endsWith('_studio_dev')
)
  throw new Error(
    'Use a dedicated local _studio_dev database, never shared or production storage.',
  );
const env = {
  ...process.env,
  DATABASE_URL: settings.DATABASE_URL,
  LEARNING_STUDIO_ENABLED: 'true',
  DIAGNOSTIC_V2_ENABLED: 'true',
};
const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
try {
  await db.diagnosticLearningRun.count();
} finally {
  await db.$disconnect();
}
const child = spawn(
  process.execPath,
  [
    resolve('node_modules/next/dist/bin/next'),
    serverMode,
    '--hostname',
    '127.0.0.1',
    '--port',
    env.PORT || '3007',
  ],
  { env, stdio: 'inherit' },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
