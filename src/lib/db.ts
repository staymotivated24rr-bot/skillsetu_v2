import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export function configuredDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? '';
}

export function deploymentDatabaseIssue() {
  if (!process.env.VERCEL) return null;
  const configured = configuredDatabaseUrl();
  if (!configured)
    return 'This deployment needs a durable PostgreSQL database. Set DATABASE_URL, then redeploy.';
  if (!/^postgres(?:ql)?:\/\//.test(configured))
    return 'DATABASE_URL must be a PostgreSQL connection string for the hosted deployment.';
  return null;
}

export function createDatabase() {
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createDatabase();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
