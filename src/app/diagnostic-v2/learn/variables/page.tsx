import { notFound } from 'next/navigation';
import { studioEnabled } from '@/lib/learning-studio/service';
import { InteractiveLessonStudio } from '@/components/interactive-lesson-studio';
export const dynamic = 'force-dynamic';
export default async function VariablesLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; competency?: string }>;
}) {
  if (!studioEnabled()) notFound();
  const { source, competency } = await searchParams;
  if (
    !!source !== !!competency ||
    (source && source.length > 100) ||
    (competency && competency.length > 100)
  )
    notFound();
  return (
    <InteractiveLessonStudio
      lessonId="python-variables-references"
      sourceRunId={source}
      competencyId={competency}
    />
  );
}
