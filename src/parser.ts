import {
  LEETCODE_CN_SOURCE,
  type Difficulty,
  type LocaleCode,
  type NormalizedProblem,
  type ProblemTag,
  type ProblemTranslation,
  type RawCodeSnippet,
  type RawLeetCodeCnQuestion,
  type RawTopicTag,
  type StarterCode,
} from "./domain.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const text = trimText(value);
    if (text) {
      return text;
    }
  }

  return null;
}

export function normalizeDifficulty(value: string | null | undefined): Difficulty | null {
  switch (trimText(value)?.toLowerCase()) {
    case "easy":
      return "easy";
    case "medium":
      return "medium";
    case "hard":
      return "hard";
    default:
      return null;
  }
}

export function extractLeetCodeCnQuestion(
  payload: unknown
): RawLeetCodeCnQuestion | null {
  if (!isRecord(payload)) {
    return null;
  }

  const data = payload.data;
  if (!isRecord(data)) {
    return null;
  }

  const question = data.question;
  if (!isRecord(question)) {
    return null;
  }

  return question as RawLeetCodeCnQuestion;
}

function buildTranslation(
  locale: LocaleCode,
  title: string | null,
  descriptionHtml: string | null
): ProblemTranslation | null {
  if (!title || !descriptionHtml) {
    return null;
  }

  return {
    locale,
    title,
    descriptionHtml,
  };
}

function normalizeTag(tag: RawTopicTag): ProblemTag | null {
  const name = firstText(tag.name, tag.translatedName);
  if (!name) {
    return null;
  }

  return {
    name,
    slug: firstText(tag.slug),
    translatedName: firstText(tag.translatedName),
  };
}

function normalizeStarterCode(snippet: RawCodeSnippet): StarterCode | null {
  const languageName = firstText(snippet.lang);
  const languageSlug = firstText(snippet.langSlug);
  const template = trimText(snippet.code);

  if (!languageName || !languageSlug || !template) {
    return null;
  }

  return {
    languageName,
    languageSlug,
    template,
  };
}

function normalizeTags(tags: RawTopicTag[] | null | undefined): ProblemTag[] {
  const seenNames = new Set<string>();
  const normalizedTags: ProblemTag[] = [];

  for (const tag of Array.isArray(tags) ? tags : []) {
    const normalized = normalizeTag(tag);
    if (!normalized || seenNames.has(normalized.name)) {
      continue;
    }

    seenNames.add(normalized.name);
    normalizedTags.push(normalized);
  }

  return normalizedTags;
}

function normalizeStarterCodes(
  snippets: RawCodeSnippet[] | null | undefined
): StarterCode[] {
  const seenSlugs = new Set<string>();
  const starterCodes: StarterCode[] = [];

  for (const snippet of Array.isArray(snippets) ? snippets : []) {
    const normalized = normalizeStarterCode(snippet);
    if (!normalized || seenSlugs.has(normalized.languageSlug)) {
      continue;
    }

    seenSlugs.add(normalized.languageSlug);
    starterCodes.push(normalized);
  }

  return starterCodes;
}

export function normalizeLeetCodeCnQuestion(
  question: RawLeetCodeCnQuestion,
  sourceFile: string
): NormalizedProblem | null {
  const englishTitle = firstText(question.title);
  const englishDescription = firstText(question.content);
  const chineseTitle = firstText(question.translatedTitle);
  const chineseDescription = firstText(question.translatedContent);
  const sourceSlug = firstText(question.titleSlug);
  const difficulty = normalizeDifficulty(question.difficulty);

  const translations = [
    buildTranslation("en", englishTitle, englishDescription),
    buildTranslation("zh-CN", chineseTitle, chineseDescription),
  ].filter((entry): entry is ProblemTranslation => entry !== null);

  if (!sourceSlug || !difficulty || translations.length === 0) {
    return null;
  }

  const primaryTranslation =
    translations.find((translation) => translation.locale === "en") ??
    translations[0];

  return {
    source: LEETCODE_CN_SOURCE,
    importKey: `${LEETCODE_CN_SOURCE}:${sourceSlug}`,
    sourceSlug,
    externalProblemId: firstText(question.questionFrontendId),
    difficulty,
    primaryLocale: primaryTranslation.locale,
    title: primaryTranslation.title,
    descriptionHtml: primaryTranslation.descriptionHtml,
    sampleTestcase: firstText(question.sampleTestCase),
    translations,
    tags: normalizeTags(question.topicTags),
    starterCodes: normalizeStarterCodes(question.codeSnippets),
    sourceFile,
  };
}
