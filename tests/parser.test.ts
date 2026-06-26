import { describe, expect, it } from "vitest";

import {
  extractLeetCodeCnQuestion,
  normalizeDifficulty,
  normalizeLeetCodeCnQuestion,
} from "../src/parser.js";

function buildQuestion(overrides: Record<string, unknown> = {}) {
  return {
    title: "Two Sum",
    translatedTitle: "两数之和",
    titleSlug: "two-sum",
    content: "<p>English body</p>",
    translatedContent: "<p>中文题面</p>",
    difficulty: "Easy",
    questionFrontendId: "1",
    sampleTestCase: "[2,7,11,15]\n9",
    topicTags: [
      { name: "Array", slug: "array", translatedName: "数组" },
      { name: "Array", slug: "array", translatedName: "数组" },
      { name: "Hash Table", slug: "hash-table", translatedName: "哈希表" },
    ],
    codeSnippets: [
      {
        lang: "JavaScript",
        langSlug: "javascript",
        code: "function twoSum() {}",
      },
      {
        lang: "JavaScript",
        langSlug: "javascript",
        code: "function duplicateTemplate() {}",
      },
      {
        lang: "Python3",
        langSlug: "python3",
        code: "class Solution:\n    pass",
      },
    ],
    ...overrides,
  };
}

describe("parser", () => {
  it("maps difficulty strings to the local lowercase union", () => {
    expect(normalizeDifficulty("Easy")).toBe("easy");
    expect(normalizeDifficulty(" medium ")).toBe("medium");
    expect(normalizeDifficulty("HARD")).toBe("hard");
    expect(normalizeDifficulty("unknown")).toBeNull();
  });

  it("extracts data.question from a LeetCode-CN payload", () => {
    const payload = { data: { question: buildQuestion() } };

    expect(extractLeetCodeCnQuestion(payload)).toMatchObject({
      titleSlug: "two-sum",
    });
    expect(extractLeetCodeCnQuestion({ data: { notQuestion: {} } })).toBeNull();
  });

  it("normalizes a bilingual question and deduplicates child collections", () => {
    const normalized = normalizeLeetCodeCnQuestion(
      buildQuestion(),
      "0001-two-sum.json"
    );

    expect(normalized).toMatchObject({
      source: "leetcode-cn",
      importKey: "leetcode-cn:two-sum",
      sourceSlug: "two-sum",
      externalProblemId: "1",
      difficulty: "easy",
      primaryLocale: "en",
      title: "Two Sum",
      descriptionHtml: "<p>English body</p>",
      sampleTestcase: "[2,7,11,15]\n9",
      sourceFile: "0001-two-sum.json",
    });
    expect(normalized?.translations).toEqual([
      {
        locale: "en",
        title: "Two Sum",
        descriptionHtml: "<p>English body</p>",
      },
      {
        locale: "zh-CN",
        title: "两数之和",
        descriptionHtml: "<p>中文题面</p>",
      },
    ]);
    expect(normalized?.tags.map((tag) => tag.name)).toEqual([
      "Array",
      "Hash Table",
    ]);
    expect(normalized?.starterCodes.map((snippet) => snippet.languageSlug)).toEqual([
      "javascript",
      "python3",
    ]);
  });

  it("falls back to Chinese when the English body is absent", () => {
    const normalized = normalizeLeetCodeCnQuestion(
      buildQuestion({
        content: "",
        translatedTitle: "无重复字符的最长子串",
        translatedContent: "<p>中文题面</p>",
        difficulty: "Medium",
        questionFrontendId: "3",
        titleSlug: "longest-substring-without-repeating-characters",
      }),
      "0003-longest-substring.json"
    );

    expect(normalized?.primaryLocale).toBe("zh-CN");
    expect(normalized?.title).toBe("无重复字符的最长子串");
    expect(normalized?.difficulty).toBe("medium");
    expect(normalized?.translations).toEqual([
      {
        locale: "zh-CN",
        title: "无重复字符的最长子串",
        descriptionHtml: "<p>中文题面</p>",
      },
    ]);
  });

  it("returns null when no complete translation body exists", () => {
    const normalized = normalizeLeetCodeCnQuestion(
      buildQuestion({ content: " ", translatedContent: null }),
      "missing-body.json"
    );

    expect(normalized).toBeNull();
  });
});
