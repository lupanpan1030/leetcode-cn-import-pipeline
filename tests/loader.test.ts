import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  compareProblemOrder,
  loadLeetCodeCnDirectory,
} from "../src/loader.js";
import type { NormalizedProblem } from "../src/domain.js";

const examplesPath = path.resolve("examples/leetcode-cn");

function questionPayload(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      question: {
        title: "Generated Problem",
        translatedTitle: "生成的问题",
        titleSlug: "generated-problem",
        content: "<p>Body</p>",
        translatedContent: "<p>正文</p>",
        difficulty: "Easy",
        questionFrontendId: "100",
        topicTags: [],
        codeSnippets: [],
        ...overrides,
      },
    },
  };
}

async function createTempSource(files: Record<string, string>): Promise<string> {
  const sourcePath = await fs.mkdtemp(
    path.join(os.tmpdir(), "leetcode-cn-import-pipeline-")
  );

  await Promise.all(
    Object.entries(files).map(([fileName, contents]) =>
      fs.writeFile(path.join(sourcePath, fileName), contents, "utf8")
    )
  );

  return sourcePath;
}

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

describe("loader", () => {
  it("loads bundled examples with two imports and three skip branches", async () => {
    const result = await loadLeetCodeCnDirectory(examplesPath);

    expect(result.problems.map((problem) => problem.sourceSlug)).toEqual([
      "two-sum",
      "longest-substring-without-repeating-characters",
    ]);
    expect(result.report.stats).toEqual({
      scannedFiles: 5,
      parsedQuestions: 3,
      importedCandidates: 2,
      duplicateCandidates: 0,
      skippedInvalidJson: 1,
      skippedMissingQuestion: 1,
      skippedMissingContent: 1,
    });
    expect(result.report.skippedFiles).toEqual([
      { fileName: "1000-bad-json.json", reason: "invalid-json" },
      { fileName: "1001-missing-question.json", reason: "missing-question" },
      {
        fileName: "1002-missing-body.json",
        reason: "missing-required-content",
      },
    ]);
  });

  it("sorts by numeric frontend id before slug fallback", () => {
    const makeProblem = (
      sourceSlug: string,
      externalProblemId: string | null
    ): NormalizedProblem => ({
      source: "leetcode-cn",
      importKey: `leetcode-cn:${sourceSlug}`,
      sourceSlug,
      externalProblemId,
      difficulty: "easy",
      primaryLocale: "en",
      title: sourceSlug,
      descriptionHtml: "<p>Body</p>",
      sampleTestcase: null,
      translations: [
        {
          locale: "en",
          title: sourceSlug,
          descriptionHtml: "<p>Body</p>",
        },
      ],
      tags: [],
      starterCodes: [],
      sourceFile: `${sourceSlug}.json`,
    });

    const sorted = [
      makeProblem("without-id", null),
      makeProblem("ten", "10"),
      makeProblem("two", "2"),
      makeProblem("alpha", null),
    ].sort(compareProblemOrder);

    expect(sorted.map((problem) => problem.sourceSlug)).toEqual([
      "two",
      "ten",
      "alpha",
      "without-id",
    ]);
  });

  it("deduplicates by import key while keeping the first sorted file", async () => {
    const sourcePath = await createTempSource({
      "a-original.json": serialize(
        questionPayload({
          title: "Original",
          titleSlug: "duplicate-slug",
          questionFrontendId: "7",
        })
      ),
      "b-duplicate.json": serialize(
        questionPayload({
          title: "Duplicate",
          titleSlug: "duplicate-slug",
          questionFrontendId: "7",
        })
      ),
    });

    const result = await loadLeetCodeCnDirectory(sourcePath);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.title).toBe("Original");
    expect(result.report.stats.duplicateCandidates).toBe(1);
    expect(result.report.duplicates).toEqual([
      {
        importKey: "leetcode-cn:duplicate-slug",
        keptSourceFile: "a-original.json",
        skippedSourceFile: "b-duplicate.json",
      },
    ]);
  });

  it("returns deterministic results for repeated reads", async () => {
    const first = await loadLeetCodeCnDirectory(examplesPath);
    const second = await loadLeetCodeCnDirectory(examplesPath);

    expect(second).toEqual(first);
  });

  it("applies the limit after sorting and deduplication", async () => {
    const result = await loadLeetCodeCnDirectory(examplesPath, { limit: 1 });

    expect(result.problems.map((problem) => problem.sourceSlug)).toEqual([
      "two-sum",
    ]);
    expect(result.report.stats.importedCandidates).toBe(1);
  });
});
