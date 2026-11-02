import { GuidedRepair } from '@/components/guided-repair';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pythonRepairs } from '@/lib/authentic/python-banks';
import styles from '@/components/diagnostic.module.css';
import { starterLessonFor } from '@/lib/diagnostic/starter-v3/lessons';
import { draftPreviewEnabled } from '@/lib/diagnostic/starter-v3/bank';
export const dynamic = 'force-dynamic';
export default async function DiagnosticLearning({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; subskill?: string }>;
}) {
  if (process.env.DIAGNOSTIC_V2_ENABLED !== 'true') notFound();
  const { skill, subskill } = await searchParams;
  const starter = skill ? starterLessonFor(skill, subskill) : undefined;
  if (starter) {
    if (!draftPreviewEnabled()) notFound();
    return (
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/diagnostic-v2" className={styles.brand}>
            <span className={styles.mark}>S</span> SkillSetu
            <span className={styles.lab}>THE LEARNING STUDIO</span>
          </Link>
          <span className={styles.pilot}>Guided practice</span>
        </header>
        <main className={styles.main}>
          <p className={styles.eyebrow}>Draft learning recommendation · practice only</p>
          <h1 className="studio-learning-title">{starter.title}</h1>
          <p>Focus: {subskill ?? starter.title}</p>
          <GuidedRepair
            subskill={subskill ?? starter.title}
            concept={starter.concept}
            example={starter.example}
            scenario={starter.scenario}
          />
          <p>
            Use this starter to investigate the named subskill; it is not a complete lesson for
            every bank item. Practice does not change diagnostic proficiency.
          </p>
          <Link href="/diagnostic-v2?preview=starter-v3">Return to the draft skill map</Link>
        </main>
      </div>
    );
  }
  const learningModule = pythonRepairs.find((m) => m.skillId === skill);
  if (!learningModule) notFound();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/diagnostic-v2" className={styles.brand}>
          <span className={styles.mark}>S</span> SkillSetu
          <span className={styles.lab}>THE LEARNING STUDIO</span>
        </Link>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>From your skill map · existing SkillSetu module</p>
        <h1 className="studio-learning-title">{learningModule.title}</h1>
        <p className={styles.lead}>{learningModule.concept}</p>
        <GuidedRepair
          subskill={subskill ?? learningModule.title}
          concept={learningModule.concept}
          example={learningModule.example}
        />
        <section className={styles.taskCard}>
          <h2>Build the intuition</h2>
          <p>{learningModule.intuition}</p>
          <h2>Work through an example</h2>
          <p>{learningModule.example}</p>
          <h2>Apply it at work</h2>
          <p>{learningModule.workplace}</p>
          <h2>Explain your reasoning</h2>
          <p>{learningModule.interview}</p>
        </section>
        <p className={styles.note}>
          Reading this module does not change assessed proficiency. Full guided practice remains in
          the existing student journey, which requires its own diagnostic.
        </p>
        <Link href="/diagnostic-v2">Return to my skill map</Link>
      </main>
    </div>
  );
}
