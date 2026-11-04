import { notFound } from 'next/navigation';
import { DiagnosticExperience } from '@/components/diagnostic-experience';
import { draftPreviewEnabled, defaultDraftPreview } from '@/lib/diagnostic/starter-v3/bank';
import { studioEnabled } from '@/lib/learning-studio/service';
export const dynamic = 'force-dynamic';
export default async function DiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  if (process.env.DIAGNOSTIC_V2_ENABLED !== 'true') notFound();
  const requested = (await searchParams).preview;
  const preview = requested === 'starter-v3' || (requested !== 'legacy' && defaultDraftPreview());
  if (preview && !draftPreviewEnabled()) notFound();
  return <DiagnosticExperience draftPreview={preview} learningEnabled={studioEnabled()} />;
}
