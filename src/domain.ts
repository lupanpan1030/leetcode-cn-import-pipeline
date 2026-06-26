export const LEETCODE_CN_SOURCE = "leetcode-cn" as const;

export type Difficulty = "easy" | "medium" | "hard";

export type LocaleCode = "en" | "zh-CN";

export type RawTopicTag = {
  name?: string | null;
  slug?: string | null;
  translatedName?: string | null;
};

export type RawCodeSnippet = {
  lang?: string | null;
  langSlug?: string | null;
  code?: string | null;
};

export type RawLeetCodeCnQuestion = {
  title?: string | null;
  translatedTitle?: string | null;
  titleSlug?: string | null;
  content?: string | null;
  translatedContent?: string | null;
  difficulty?: string | null;
  questionFrontendId?: string | null;
  sampleTestCase?: string | null;
  topicTags?: RawTopicTag[] | null;
  codeSnippets?: RawCodeSnippet[] | null;
};

export type ProblemTranslation = {
  locale: LocaleCode;
  title: string;
  descriptionHtml: string;
};

export type ProblemTag = {
  name: string;
  slug: string | null;
  translatedName: string | null;
};

export type StarterCode = {
  languageName: string;
  languageSlug: string;
  template: string;
};

export type NormalizedProblem = {
  source: typeof LEETCODE_CN_SOURCE;
  importKey: string;
  sourceSlug: string;
  externalProblemId: string | null;
  difficulty: Difficulty;
  primaryLocale: LocaleCode;
  title: string;
  descriptionHtml: string;
  sampleTestcase: string | null;
  translations: ProblemTranslation[];
  tags: ProblemTag[];
  starterCodes: StarterCode[];
  sourceFile: string;
};

export type SkipReason =
  | "invalid-json"
  | "missing-question"
  | "missing-required-content";

export type SkippedFile = {
  fileName: string;
  reason: SkipReason;
};

export type DuplicateProblem = {
  importKey: string;
  keptSourceFile: string;
  skippedSourceFile: string;
};

export type ImportStats = {
  scannedFiles: number;
  parsedQuestions: number;
  importedCandidates: number;
  duplicateCandidates: number;
  skippedInvalidJson: number;
  skippedMissingQuestion: number;
  skippedMissingContent: number;
};

export type ImportReport = {
  stats: ImportStats;
  skippedFiles: SkippedFile[];
  duplicates: DuplicateProblem[];
  outputFiles: {
    problems: string;
    report: string;
  };
};

export type LoadOptions = {
  limit?: number;
};

export type PipelineResult = {
  problems: NormalizedProblem[];
  report: ImportReport;
};
