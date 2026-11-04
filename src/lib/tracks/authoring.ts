import type { Item, LessonSeed, Skill } from '../types';
export type Check = [string, string, string, string, string]; // prompt, correct, distractors, explanation
export type Topic = {
  key: string;
  name: string;
  category: string;
  prerequisites: string[];
  concept: string;
  intuition: string;
  example: string;
  checks: Check[];
};
export function skillBank(prefix: string, topics: Topic[]): Skill[] {
  return topics.map((t) => ({
    id: `${prefix}-${t.key}`,
    name: t.name,
    category: t.category,
    description: t.concept,
    target: ['testing', 'exceptions', 'clarification'].includes(t.key) ? 75 : 70,
    importance: ['testing', 'debugging', 'reasoning'].includes(t.key) ? 5 : 4,
    prerequisites: t.prerequisites.map((p) => `${prefix}-${p}`),
  }));
}
export function lessonBank(prefix: string, topics: Topic[]): LessonSeed[] {
  return topics.map((t) => ({
    id: `lesson-${prefix}-${t.key}`,
    skillId: `${prefix}-${t.key}`,
    title: t.name,
    minutes: 10,
    content: {
      objective: t.concept,
      introduction: t.concept,
      intuition: t.intuition,
      example: t.example,
      summary: `${t.concept} ${t.intuition}`,
      items: t.checks.map(([prompt, good, bad, worse, explanation], i) => {
        const id = `${prefix}-${t.key}-p${i + 1}`;
        const offset = [...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 3;
        const options = [good, bad, worse];
        return {
          id,
          prompt,
          options: [...options.slice(offset), ...options.slice(0, offset)],
          correct: (3 - offset) % 3,
          hint: t.intuition,
          explanation,
        };
      }),
    },
  }));
}
export function task(
  id: string,
  phase: string,
  prompt: string,
  context: string,
  choices: [string, string, string],
  explanation: string,
  prefix: string,
  keys: string[],
  followup?: [string, string],
): Item {
  const offset = [...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 3;
  const options = choices.map((text, i) => ({
    text,
    response: followup
      ? followup[i === 0 ? 0 : 1]
      : i === 0
        ? `That addresses the case: ${explanation} Let’s work through the next decision.`
        : `That leaves a risk: ${explanation} Use this information for the next decision.`,
  }));
  return {
    id,
    phase,
    prompt,
    context,
    options: [...options.slice(offset), ...options.slice(0, offset)],
    correct: (3 - offset) % 3,
    explanation,
    skills: keys.map((key, i) => ({ skillId: `${prefix}-${key}`, weight: i === 0 ? 2 : 1 })),
  };
}
