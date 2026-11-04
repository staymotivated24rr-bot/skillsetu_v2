import { notFound } from 'next/navigation';
import { studioEnabled } from '@/lib/learning-studio/service';
import { lessonNavigation } from '@/lib/learning-studio/lesson-navigation';
import { InteractiveLessonStudio } from '@/components/interactive-lesson-studio';
export const dynamic = 'force-dynamic';
export default async function LessonPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string; source?: string; competency?: string; run?: string }>;
}) {
  if (!studioEnabled()) notFound();
  const { lesson, source, competency, run } = await searchParams;
  if (
    (run !== undefined && (typeof run !== 'string' || run.length > 100)) ||
    !lesson ||
    typeof lesson !== 'string' ||
    !Object.hasOwn(lessonNavigation, lesson) ||
    !!source !== !!competency ||
    (source && (typeof source !== 'string' || source.length > 100)) ||
    (competency && (typeof competency !== 'string' || competency.length > 100))
  )
    notFound();
  return (
    <InteractiveLessonStudio
      lessonId={lesson}
      sourceRunId={source}
      competencyId={competency}
      learningRunId={run}
    />
  );
}
