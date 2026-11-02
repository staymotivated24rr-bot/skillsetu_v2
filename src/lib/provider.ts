import type { PracticeItem } from './types';
export interface LearningProvider {
  readonly name: string;
  hint(item: PracticeItem): Promise<string>;
  explain(item: PracticeItem): Promise<string>;
}
export class LocalLearningProvider implements LearningProvider {
  readonly name = 'Original local content';
  async hint(item: PracticeItem) {
    return item.hint;
  }
  async explain(item: PracticeItem) {
    return item.explanation;
  }
}
// Optional providers can be injected here later. Core learning always has a local fallback.
export class FallbackLearningProvider implements LearningProvider {
  readonly name = 'Provider with local fallback';
  constructor(
    private primary: LearningProvider,
    private fallback: LearningProvider = new LocalLearningProvider(),
  ) {}
  async hint(item: PracticeItem) {
    try {
      return await this.primary.hint(item);
    } catch {
      return this.fallback.hint(item);
    }
  }
  async explain(item: PracticeItem) {
    try {
      return await this.primary.explain(item);
    } catch {
      return this.fallback.explain(item);
    }
  }
}
export const provider: LearningProvider = new LocalLearningProvider();
