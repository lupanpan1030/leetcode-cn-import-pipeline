# LeetCode-CN Import Pipeline

[![CI](https://github.com/lupanpan1030/leetcode-cn-import-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/lupanpan1030/leetcode-cn-import-pipeline/actions/workflows/ci.yml)

Standalone TypeScript pipeline for turning local LeetCode-CN `originData` JSON files into deterministic normalized JSON artifacts.

It has no Prisma, SQLite, Electron, or application-runtime dependency.

## Quick Start

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run example
```

`npm run example` reads the five bundled fixtures from `examples/leetcode-cn` and writes:

- `tmp/leetcode-cn/problems.json`
- `tmp/leetcode-cn/report.json`

Expected example summary:

```text
Scanned 5 JSON files; imported 2 problems.
Skipped 1 invalid JSON, 1 missing question, 1 missing content.
```

## CLI

```bash
npm run import:leetcode-cn -- --source examples/leetcode-cn --out tmp/leetcode-cn --pretty --verbose
```

Flags:

- `--source <dir>`: directory containing LeetCode-CN JSON files, default `examples/leetcode-cn`
- `--out <dir>`: output directory, default `tmp/leetcode-cn`
- `--limit <n>`: keep the first `n` normalized problems after sorting
- `--pretty`: write two-space indented JSON
- `--dry-run`: parse and report without writing output files
- `--strict`: return a non-zero exit code when any file is skipped
- `--verbose`: print selected problems and skipped files
- `--help`: show usage

## Output

`problems.json` contains normalized records with:

- source and import key
- source slug and external problem id
- local `Difficulty` value: `"easy" | "medium" | "hard"`
- primary locale, title, and HTML description
- complete translation entries
- deduplicated tags
- deduplicated starter-code snippets
- source file name

`report.json` contains deterministic scan counts, skip counts, skipped file details, duplicate details, and output file names.

## Limitations

1. This is specific to LeetCode-CN `originData`-style GraphQL responses.
2. It only reads public structured fields from local JSON files.
3. It writes clean JSON artifacts and reports, not database rows.
4. HTML descriptions are passed through as source HTML and are not sanitized.
5. Normalization uses source-specific heuristics for translations, sorting, and deduplication.

## Development

```bash
npm run lint
npm run typecheck
npm run test
```

The core code uses Node.js built-ins only. Tooling dependencies are development-only.
