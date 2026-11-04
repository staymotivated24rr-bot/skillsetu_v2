import { notFound } from 'next/navigation';
import Link from 'next/link';
import { studioEnabled } from '@/lib/learning-studio/service';
import { AdaptiveLearningRecommendation } from '@/components/adaptive-learning-recommendation';
import styles from '@/components/interactive-lesson-studio.module.css';
export const dynamic = 'force-dynamic';
export default async function LearningRevisionPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; decision?: string }>;
}) {
  if (!studioEnabled()) notFound();
  const { source, decision } = await searchParams;
  if (
    typeof source !== 'string' ||
    !source ||
    source.length > 100 ||
    (decision !== undefined && (typeof decision !== 'string' || !decision || decision.length > 100))
  )
    notFound();
  return (
    <div className="product-app">
      <main className={styles.shell} id="main-content">
        <h1>Your learning and revision</h1>
        <Link href={`/diagnostic-v2?run=${encodeURIComponent(source)}`}>
          Return to your original diagnostic report
        </Link>
        <AdaptiveLearningRecommendation sourceRunId={source} decisionId={decision} />
      </main>
    </div>
  );
}
