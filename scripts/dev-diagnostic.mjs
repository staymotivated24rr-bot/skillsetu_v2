import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

export function diagnosticDevelopmentEnv(settings, inherited = process.env) {
  const url = new URL(settings.DATABASE_URL ?? '');
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    inherited.VERCEL
  )
    throw new Error(
      'Diagnostic development requires a local PostgreSQL database, never a hosted deployment.',
    );
  return {
    ...inherited,
    DATABASE_URL: settings.DATABASE_URL,
    DIAGNOSTIC_V2_ENABLED: 'true',
    DIAGNOSTIC_STARTER_V3_PREVIEW: 'true',
    DIAGNOSTIC_STARTER_V3_DEFAULT: 'true',
    DIAGNOSTIC_DRAFT_ENV: 'local',
  };
}

async function main() {
  let env;
  try {
    env = diagnosticDevelopmentEnv(parseEnv(readFileSync('.env.audit', 'utf8')));
    const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
    try {
      const [tables] = await db.$queryRaw`SELECT
        to_regclass('public."DiagnosticSession"')::text AS sessions,
        to_regclass('public."DiagnosticRun"')::text AS runs,
        to_regclass('public."DiagnosticResponse"')::text AS responses`;
      if (!tables.sessions || !tables.runs || !tables.responses)
        throw new Error('Missing diagnostic tables');
    } finally {
      await db.$disconnect();
    }
  } catch {
    console.error(
      'Diagnostic storage is not ready. Check local PostgreSQL and .env.audit. No migrations, seed or resets were run.',
    );
    process.exitCode = 1;
    return;
  }
  const child = spawn(
    process.execPath,
    [
      resolve('node_modules/next/dist/bin/next'),
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      env.PORT || '3002',
    ],
    { env, stdio: 'inherit' },
  );
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
