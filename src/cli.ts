#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { loadLeetCodeCnDirectory } from "./loader.js";
import type { NormalizedProblem, PipelineResult } from "./domain.js";

const DEFAULT_SOURCE = "examples/leetcode-cn";
const DEFAULT_OUT_DIR = "tmp/leetcode-cn";

export type CliOptions = {
  sourcePath: string;
  outDir: string;
  limit?: number;
  pretty: boolean;
  dryRun: boolean;
  strict: boolean;
  verbose: boolean;
  help: boolean;
};

type CliIo = {
  log(message: string): void;
  error(message: string): void;
};

export function getUsage(): string {
  return [
    "Usage:",
    "  npm run import:leetcode-cn -- --source examples/leetcode-cn --out tmp/leetcode-cn [--pretty] [--dry-run] [--strict] [--verbose]",
    "",
    "Options:",
    `  --source <dir>   Directory containing LeetCode-CN JSON files. Default: ${DEFAULT_SOURCE}`,
    `  --out <dir>      Directory for problems.json and report.json. Default: ${DEFAULT_OUT_DIR}`,
    "  --limit <n>      Keep only the first n normalized problems after sorting.",
    "  --pretty         Write two-space indented JSON.",
    "  --dry-run        Parse and report without writing output files.",
    "  --strict         Return a non-zero exit code when any file is skipped.",
    "  --verbose        Print selected problems and skipped files.",
    "  --help, -h       Show this message.",
  ].join("\n");
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

export function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    sourcePath: DEFAULT_SOURCE,
    outDir: DEFAULT_OUT_DIR,
    pretty: false,
    dryRun: false,
    strict: false,
    verbose: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--source":
      case "--source-path":
        options.sourcePath = readFlagValue(argv, index, token);
        index += 1;
        break;
      case "--out":
      case "--output":
        options.outDir = readFlagValue(argv, index, token);
        index += 1;
        break;
      case "--limit": {
        const limit = Number.parseInt(readFlagValue(argv, index, token), 10);
        if (!Number.isInteger(limit) || limit <= 0) {
          throw new Error("--limit must be a positive integer.");
        }
        options.limit = limit;
        index += 1;
        break;
      }
      case "--pretty":
        options.pretty = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return options;
}

function stringifyJson(value: unknown, pretty: boolean): string {
  return `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`;
}

function formatProblem(problem: NormalizedProblem): string {
  const idPrefix = problem.externalProblemId
    ? `#${problem.externalProblemId} `
    : "";
  return `${idPrefix}${problem.title} (${problem.difficulty}, ${problem.primaryLocale})`;
}

async function writeOutput(
  result: PipelineResult,
  outDir: string,
  pretty: boolean
): Promise<{ problemsPath: string; reportPath: string }> {
  const resolvedOutDir = path.resolve(outDir);
  const problemsPath = path.join(resolvedOutDir, result.report.outputFiles.problems);
  const reportPath = path.join(resolvedOutDir, result.report.outputFiles.report);

  await fs.mkdir(resolvedOutDir, { recursive: true });
  await Promise.all([
    fs.writeFile(problemsPath, stringifyJson(result.problems, pretty), "utf8"),
    fs.writeFile(reportPath, stringifyJson(result.report, pretty), "utf8"),
  ]);

  return { problemsPath, reportPath };
}

function printSummary(
  result: PipelineResult,
  outputPaths: { problemsPath: string; reportPath: string } | null,
  options: CliOptions,
  io: CliIo
): void {
  const { stats } = result.report;
  io.log(
    `Scanned ${stats.scannedFiles} JSON files; imported ${stats.importedCandidates} problems.`
  );
  io.log(
    `Skipped ${stats.skippedInvalidJson} invalid JSON, ${stats.skippedMissingQuestion} missing question, ${stats.skippedMissingContent} missing content.`
  );
  if (outputPaths) {
    io.log(`Wrote ${outputPaths.problemsPath}`);
    io.log(`Wrote ${outputPaths.reportPath}`);
  } else {
    io.log("Dry run: no files written.");
  }

  if (!options.verbose) {
    return;
  }

  if (result.problems.length > 0) {
    io.log("Problems:");
    for (const problem of result.problems) {
      io.log(`- ${formatProblem(problem)} from ${problem.sourceFile}`);
    }
  }

  if (result.report.skippedFiles.length > 0) {
    io.log("Skipped files:");
    for (const skippedFile of result.report.skippedFiles) {
      io.log(`- ${skippedFile.fileName}: ${skippedFile.reason}`);
    }
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runCli(
  argv: string[],
  io: CliIo = console
): Promise<number> {
  const options = parseCliArgs(argv);

  if (options.help) {
    io.log(getUsage());
    return 0;
  }

  const result = await loadLeetCodeCnDirectory(options.sourcePath, {
    limit: options.limit,
  });
  const outputPaths = options.dryRun
    ? null
    : await writeOutput(result, options.outDir, options.pretty);
  printSummary(result, outputPaths, options, io);

  if (options.strict && result.report.skippedFiles.length > 0) {
    io.error(
      `Strict mode failed: ${result.report.skippedFiles.length} file(s) were skipped.`
    );
    return 1;
  }

  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(`Failed to import LeetCode-CN data: ${formatError(error)}`);
      process.exitCode = 1;
    });
}
