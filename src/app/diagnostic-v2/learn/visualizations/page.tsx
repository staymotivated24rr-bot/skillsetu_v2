import { notFound } from 'next/navigation';
import { studioEnabled } from '@/lib/learning-studio/service';
import { pythonTraces } from '@/lib/learning-studio/trace-content';
import { PythonVisualizationStudio } from '@/components/python-visualization-studio';
export const dynamic = 'force-dynamic';
export default function PythonVisualizationsPage() {
  if (!studioEnabled()) notFound();
  return (
    <PythonVisualizationStudio
      catalog={pythonTraces.map(({ id, title, kind }) => ({ id, title, kind }))}
    />
  );
}
