import { writeFileSync } from 'node:fs';
import { db } from '../src/lib/db';
import { draftPreviewEnabled, STARTER_BANK_ID } from '../src/lib/diagnostic/starter-v3/bank';
import type { Answer, Bank } from '../src/lib/diagnostic/types';
async function main() {
  if (!draftPreviewEnabled())
    throw new Error('Pilot export is restricted to explicitly enabled local draft data.');
  const runs = await db.diagnosticRun.findMany({
    where: { bankId: STARTER_BANK_ID, status: 'completed' },
    include: { responses: true },
  });
  const items = new Map<
    string,
    {
      id: string;
      version: string;
      independent: number;
      correct: number;
      assisted: number;
      unsure: number;
      choices: Record<string, number>;
      pairs: [number, number][];
    }
  >();
  for (const run of runs) {
    const bank = JSON.parse(run.bankSnapshot) as Bank;
    const unassisted = run.responses.filter((r) => !r.assisted);
    for (const response of run.responses) {
      const q = bank.questions.find((q) => q.id === response.questionId)!;
      const identity = bank.id + '/' + q.version + '/' + q.id;
      if (!items.has(identity))
        items.set(identity, {
          id: q.id,
          version: q.version,
          independent: 0,
          correct: 0,
          assisted: 0,
          unsure: 0,
          choices: {},
          pairs: [],
        });
      const item = items.get(identity)!,
        answer = JSON.parse(response.payload) as Answer;
      if (response.assisted) {
        item.assisted++;
        continue;
      }
      item.independent++;
      if (response.correct) item.correct++;
      const choice =
        answer.selected === undefined
          ? answer.text?.toLowerCase() === 'unsure'
            ? 'unsure'
            : 'numeric'
          : String.fromCharCode(65 + answer.selected);
      item.choices[choice] = (item.choices[choice] ?? 0) + 1;
      if (choice === 'unsure') item.unsure++;
      const rest = unassisted.filter((r) => r.id !== response.id);
      if (rest.length)
        item.pairs.push([
          Number(response.correct),
          rest.filter((r) => r.correct).length / rest.length,
        ]);
    }
  }
  const correlation = (pairs: [number, number][]) => {
    if (pairs.length < 30) return null;
    const mean = (axis: 0 | 1) => pairs.reduce((sum, p) => sum + p[axis], 0) / pairs.length;
    const x = mean(0),
      y = mean(1);
    const covariance = pairs.reduce((sum, p) => sum + (p[0] - x) * (p[1] - y), 0);
    const spread = Math.sqrt(
      pairs.reduce((s, p) => s + (p[0] - x) ** 2, 0) *
        pairs.reduce((s, p) => s + (p[1] - y) ** 2, 0),
    );
    return spread ? covariance / spread : null;
  };
  const output = {
    note: 'Synthetic local QA data is not learner validation. Rest-score correlations are descriptive, selection-biased and suppressed below 30 independent observations. No capacity or psychometric claim.',
    completedRuns: runs.length,
    items: [...items.values()].map(({ pairs, ...item }) => ({
      ...item,
      proportionCorrect: item.independent ? item.correct / item.independent : null,
      restScoreCorrelation: correlation(pairs),
    })),
  };
  writeFileSync('.env.local-runtime/starter-v3-pilot.json', JSON.stringify(output, null, 2));
  console.log(
    'Aggregate-only local export written to ignored .env.local-runtime/starter-v3-pilot.json',
  );
}
void main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
