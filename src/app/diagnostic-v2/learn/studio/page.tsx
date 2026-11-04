import { notFound } from 'next/navigation';
import { studioEnabled } from '@/lib/learning-studio/service';
import { InteractiveLessonStudio } from '@/components/interactive-lesson-studio';
export const dynamic = 'force-dynamic';
export default function StudioPage() {
  if (!studioEnabled()) notFound();
  return <InteractiveLessonStudio />;
}
