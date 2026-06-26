import fs from "node:fs/promises";
import path from "node:path";

import {
  type DuplicateProblem,
  type ImportReport,
  type ImportStats,
  type LoadOptions,
  type NormalizedProblem,
  type PipelineResult,
  type SkippedFile,
} from "./domain.js";
import {
  extractLeetCodeCnQuestion,
  normalizeLeetCodeCnQuestion,
} from "./parser.js";

const OUTPUT_FILE_NAMES = {
  problems: "problems.json",
  report: "report.json",
} as const;

function createEmptyStats(): ImportStats {
  return {
    scannedFiles: 0,
    parsedQuestions: 0,
    importedCandidates: 0,
    duplicateCandidates: 0,
    skippedInvalidJson: 0,
    skippedMissingQuestion: 0,
    skippedMissingContent: 0,
  };
}

function createReport(
  stats: ImportStats,
  skippedFiles: SkippedFile[],
  duplicates: DuplicateProblem[]
): ImportReport {
  return {
    stats,
    skippedFiles,
    duplicates,
    outputFiles: OUTPUT_FILE_NAMES,
  };
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

async function listJsonFiles(sourcePath: string): Promise<string[]> {
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function numericProblemId(problem: NormalizedProblem): number | null {
  if (!problem.externalProblemId) {
    return null;
  }

  const numericId = Number(problem.externalProblemId);
  return Number.isFinite(numericId) ? numericId : null;
}

export function compareProblemOrder(
  left: NormalizedProblem,
  right: NormalizedProblem
): number {
  const leftId = numericProblemId(left);
  const rightId = numericProblemId(right);

  if (leftId !== null && rightId !== null && leftId !== rightId) {
    return leftId - rightId;
  }

  if (leftId !== null && rightId === null) {
    return -1;
  }

  if (leftId === null && rightId !== null) {
    return 1;
  }

  const slugOrder = left.sourceSlug.localeCompare(right.sourceSlug);
  if (slugOrder !== 0) {
    return slugOrder;
  }

  return left.sourceFile.localeCompare(right.sourceFile);
}

function applyLimit(
  problems: NormalizedProblem[],
  limit: number | undefined
): NormalizedProblem[] {
  if (limit === undefined) {
    return problems;
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("--limit must be a positive integer.");
  }

  return problems.slice(0, limit);
}

function dedupeProblems(problems: NormalizedProblem[]): {
  problems: NormalizedProblem[];
  duplicates: DuplicateProblem[];
} {
  const keptByImportKey = new Map<string, NormalizedProblem>();
  const deduped: NormalizedProblem[] = [];
  const duplicates: DuplicateProblem[] = [];

  for (const problem of problems) {
    const kept = keptByImportKey.get(problem.importKey);
    if (kept) {
      duplicates.push({
        importKey: problem.importKey,
        keptSourceFile: kept.sourceFile,
        skippedSourceFile: problem.sourceFile,
      });
      continue;
    }

    keptByImportKey.set(problem.importKey, problem);
    deduped.push(problem);
  }

  return { problems: deduped, duplicates };
}

export async function loadLeetCodeCnDirectory(
  sourcePath: string,
  options: LoadOptions = {}
): Promise<PipelineResult> {
  const normalizedSourcePath = path.resolve(sourcePath);
  const fileNames = await listJsonFiles(normalizedSourcePath);
  const stats = createEmptyStats();
  const skippedFiles: SkippedFile[] = [];
  const normalizedProblems: NormalizedProblem[] = [];

  for (const fileName of fileNames) {
    const filePath = path.join(normalizedSourcePath, fileName);
    stats.scannedFiles += 1;

    const payload = parseJson(await fs.readFile(filePath, "utf8"));
    if (payload === null) {
      stats.skippedInvalidJson += 1;
      skippedFiles.push({ fileName, reason: "invalid-json" });
      continue;
    }

    const question = extractLeetCodeCnQuestion(payload);
    if (!question) {
      stats.skippedMissingQuestion += 1;
      skippedFiles.push({ fileName, reason: "missing-question" });
      continue;
    }

    stats.parsedQuestions += 1;

    const normalized = normalizeLeetCodeCnQuestion(question, fileName);
    if (!normalized) {
      stats.skippedMissingContent += 1;
      skippedFiles.push({ fileName, reason: "missing-required-content" });
      continue;
    }

    normalizedProblems.push(normalized);
  }

  const { problems: dedupedProblems, duplicates } = dedupeProblems(normalizedProblems);
  const sortedProblems = [...dedupedProblems].sort(compareProblemOrder);
  const selectedProblems = applyLimit(sortedProblems, options.limit);

  stats.duplicateCandidates = duplicates.length;
  stats.importedCandidates = selectedProblems.length;

  return {
    problems: selectedProblems,
    report: createReport(stats, skippedFiles, duplicates),
  };
}
