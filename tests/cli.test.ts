import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseCliArgs, runCli } from "../src/cli.js";
import type { ImportReport, NormalizedProblem } from "../src/domain.js";

describe("cli", () => {
  it("parses CLI flags", () => {
    const options = parseCliArgs([
      "--source",
      "examples/leetcode-cn",
      "--out",
      "tmp/custom",
      "--limit",
      "1",
      "--pretty",
      "--dry-run",
      "--strict",
      "--verbose",
    ]);

    expect(options).toEqual({
      sourcePath: "examples/leetcode-cn",
      outDir: "tmp/custom",
      limit: 1,
      pretty: true,
      dryRun: true,
      strict: true,
      verbose: true,
      help: false,
    });
  });

  it("writes problems.json and report.json", async () => {
    const outDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "leetcode-cn-import-pipeline-cli-")
    );
    const logs: string[] = [];

    const exitCode = await runCli(
      ["--source", "examples/leetcode-cn", "--out", outDir, "--pretty"],
      {
        log: (message) => logs.push(message),
        error: (message) => logs.push(message),
      }
    );

    const problems = JSON.parse(
      await fs.readFile(path.join(outDir, "problems.json"), "utf8")
    ) as NormalizedProblem[];
    const report = JSON.parse(
      await fs.readFile(path.join(outDir, "report.json"), "utf8")
    ) as ImportReport;

    expect(exitCode).toBe(0);
    expect(problems).toHaveLength(2);
    expect(report.stats.importedCandidates).toBe(2);
    expect(logs[0]).toBe("Scanned 5 JSON files; imported 2 problems.");
  });

  it("supports dry-run without writing output files", async () => {
    const parentDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "leetcode-cn-import-pipeline-dry-run-")
    );
    const outDir = path.join(parentDir, "out");
    const logs: string[] = [];

    const exitCode = await runCli(
      ["--source", "examples/leetcode-cn", "--out", outDir, "--dry-run"],
      {
        log: (message) => logs.push(message),
        error: (message) => logs.push(message),
      }
    );

    await expect(fs.access(outDir)).rejects.toThrow();
    expect(exitCode).toBe(0);
    expect(logs).toContain("Dry run: no files written.");
  });

  it("returns non-zero in strict mode when files are skipped", async () => {
    const logs: string[] = [];

    const exitCode = await runCli(
      ["--source", "examples/leetcode-cn", "--dry-run", "--strict"],
      {
        log: (message) => logs.push(message),
        error: (message) => logs.push(message),
      }
    );

    expect(exitCode).toBe(1);
    expect(logs).toContain("Strict mode failed: 3 file(s) were skipped.");
  });
});
