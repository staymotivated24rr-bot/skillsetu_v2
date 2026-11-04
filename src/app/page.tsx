import { SkillSetu } from '@/components/skillsetu';
import { defaultDraftPreview } from '@/lib/diagnostic/starter-v3/bank';
export const dynamic = 'force-dynamic';
export default function Page() {
  return (
    <SkillSetu
      pythonDiagnostic={
        process.env.DIAGNOSTIC_V2_ENABLED === 'true'
          ? defaultDraftPreview()
            ? 'starter'
            : 'legacy'
          : null
      }
    />
  );
}
