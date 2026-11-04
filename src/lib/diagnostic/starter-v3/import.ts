import { createHash } from 'node:crypto';
import { db } from '../../db';
import {
  draftPreviewEnabled,
  starterDiagnostic,
  starterSource,
  validateStarterSource,
} from './bank';
import { validateBank } from '../engine';

/** Existing immutable bank storage: one transactional snapshot with versioned item identities. */
export async function importStarterDraft() {
  if (!draftPreviewEnabled())
    throw new Error('Import requires the explicit local draft gate and a loopback database.');
  validateStarterSource();
  validateBank(starterDiagnostic);
  const content = JSON.stringify({ bank: starterDiagnostic, source: starterSource });
  const digest = createHash('sha256').update(content).digest('hex');
  const id = starterDiagnostic.id + '-source';
  return db.$transaction(async (tx) => {
    const row = await tx.assessmentBank.upsert({
      where: { id },
      update: {},
      create: {
        id,
        roleId: starterDiagnostic.roleId,
        kind: 'adaptive-diagnostic-draft-source',
        version: starterDiagnostic.version,
        contentVersion: starterSource.version,
        content,
        digest,
      },
    });
    if (row.digest !== digest || row.content !== content)
      throw new Error('Immutable source mismatch. Import under a new version.');
    return {
      id,
      digest,
      count: starterDiagnostic.questions.length,
      status: 'DRAFT',
      enabledForLearners: false,
    };
  });
}
