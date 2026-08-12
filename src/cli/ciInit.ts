import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { GeneratorError } from '../core/resolve/errors.js';
import type { Reporter } from './reporter.js';

/**
 * `ci init` — writes the two workflow files that keep a project's rules honest.
 *
 * The workflows are held here as string constants rather than as generator
 * templates on purpose: they are not part of a generated project's output.
 * A project generated a year ago should be able to run `ci init` and get
 * today's workflows without regenerating anything, and `upgrade` must not
 * start overwriting a file the user is expected to edit (schedules, branch
 * filters, whether it blocks) — so these are written once, deliberately, and
 * never fingerprinted.
 */

export interface CiInitFlags {
  dir?: string;
  dryRun: boolean;
  force: boolean;
  refresh: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--dry-run', '--force', '--no-refresh', '-h', '--help']);
const VALUED = new Set(['--dir']);

export function parseCiInitFlags(argv: string[]): CiInitFlags {
  const flags: CiInitFlags = { dryRun: false, force: false, refresh: true, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--dry-run') flags.dryRun = true;
      if (arg === '--force') flags.force = true;
      if (arg === '--no-refresh') flags.refresh = false;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError(
          'INVALID_CONFIG',
          `${arg} needs a value.`,
          `Example: ${arg} ./my-app`,
        );
      }
      flags.dir = value;
      continue;
    }

    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown flag ${arg}.`,
      'Run `ai-project-bootstrap ci --help` to see every flag.',
    );
  }

  return flags;
}

export const CI_INIT_HELP_TEXT = `
ai-project-bootstrap ci init — add the workflows that check and refresh this project's rules.

Usage
  npx ai-project-bootstrap ci init [options]

Writes two GitHub Actions workflows:

  .github/workflows/ai-rules.yml          reports drift on every pull request,
                                          as one comment that updates in place
  .github/workflows/ai-rules-refresh.yml  opens a pull request when there is
                                          something to refresh

Neither blocks a build by default — the check reports and gets out of the way.
Both are yours to edit afterwards; nothing regenerates or overwrites them.

Options
      --dir <path>   Project to write into (default: the current directory)
      --no-refresh   Only the check workflow, not the weekly refresh PR
      --dry-run      Show what would be written without touching disk
      --force        Overwrite workflows that already exist
  -h, --help         Show this help
`.trim();

const CHECK_WORKFLOW = `# Reports when this repo's generated AI coding rules fall behind the templates
# ai-project-bootstrap would write today.
#
# Written by \`ai-project-bootstrap ci init\`. Yours to edit — nothing regenerates it.
name: AI rules

on:
  pull_request:
  # A repo can drift because the generator moved, not because anyone touched
  # the code, so the default branch is checked on a schedule too.
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

permissions:
  contents: read
  # Without this the check still runs and reports to the job summary; only the
  # pull-request comment is skipped.
  pull-requests: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - uses: igorishchenko/ai-project-bootstrap-action@v1
        with:
          # none | info | warning | critical — 'none' reports without failing
          # the build. Move to 'warning' once this repo is current and you want
          # it to stay that way.
          fail-on: none
`;

const REFRESH_WORKFLOW = `# Opens a pull request when this repo's AI coding rules fall behind.
#
# Written by \`ai-project-bootstrap ci init\`. Yours to edit — nothing regenerates it.
name: Refresh AI rules

on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

# Fixed, so a later run updates the open PR instead of opening a second one.
env:
  BRANCH: ai-rules/refresh

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'

      # Captured before upgrading — afterwards there is nothing left to report.
      - id: check
        run: |
          npx --yes ai-project-bootstrap check --json > /tmp/check.json || true
          echo "edited=$(jq -r '.counts.edited' /tmp/check.json)" >> "$GITHUB_OUTPUT"
          echo "version=$(jq -r '.generatorVersion.installed' /tmp/check.json)" >> "$GITHUB_OUTPUT"

      - run: npx --yes ai-project-bootstrap upgrade

      - id: diff
        run: |
          if [ -z "$(git status --porcelain)" ]; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
            echo "Nothing to refresh."
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

      - if: steps.diff.outputs.changed == 'true'
        env:
          GH_TOKEN: \${{ github.token }}
          VERSION: \${{ steps.check.outputs.version }}
          EDITED: \${{ steps.check.outputs.edited }}
        run: |
          set -euo pipefail
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git switch -C "$BRANCH"
          git add -A
          git commit -m "chore: refresh AI rules to v\${VERSION}"
          # Force, because this branch is a rolling snapshot of "current",
          # never a history anyone builds on.
          git push --force origin "$BRANCH"

          {
            echo "Refreshes this repo's generated AI coding rules to the templates in"
            echo "\\\`ai-project-bootstrap@\${VERSION}\\\`."
            echo
            if [ "\${EDITED}" != "0" ] && [ "\${EDITED}" != "null" ]; then
              echo "\${EDITED} file(s) you edited by hand were left untouched."
              echo
            fi
            echo "Generated by \\\`ai-project-bootstrap upgrade\\\`."
          } > /tmp/body.md

          if ! gh pr view "$BRANCH" --json number >/dev/null 2>&1; then
            gh pr create --base "\${GITHUB_REF_NAME}" --head "$BRANCH" \\
              --title "Refresh AI rules to v\${VERSION}" --body-file /tmp/body.md
          else
            gh pr edit "$BRANCH" \\
              --title "Refresh AI rules to v\${VERSION}" --body-file /tmp/body.md
          fi
`;

interface WorkflowFile {
  relativePath: string;
  content: string;
}

export function workflowFiles(includeRefresh: boolean): WorkflowFile[] {
  const files: WorkflowFile[] = [
    { relativePath: '.github/workflows/ai-rules.yml', content: CHECK_WORKFLOW },
  ];
  if (includeRefresh) {
    files.push({
      relativePath: '.github/workflows/ai-rules-refresh.yml',
      content: REFRESH_WORKFLOW,
    });
  }
  return files;
}

export async function runCiInit(
  argv: string[],
  _rootDir: string,
  reporter: Reporter,
): Promise<number> {
  // `ci` is a group, and `init` is its only subcommand today. Checked before
  // the flag parser so `ci --help` and `ci init --help` both work.
  const [subcommand, ...rest] = argv[0] === 'init' ? argv : ['init', ...argv];
  if (subcommand !== 'init') {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown ci subcommand "${subcommand}".`,
      'The only one today is `ci init`.',
    );
  }

  const flags = parseCiInitFlags(rest);
  if (flags.help) {
    reporter.plain(CI_INIT_HELP_TEXT);
    return 0;
  }

  const targetDir = path.resolve(flags.dir ?? process.cwd());
  const configFile = path.join(targetDir, CONFIG_FILENAME);

  if (!fs.existsSync(configFile)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `No ${CONFIG_FILENAME} found in ${targetDir}.`,
      'These workflows check a project this tool generated. Pass --dir to point at one.',
    );
  }

  const files = workflowFiles(flags.refresh);
  const existing = files.filter((file) =>
    fs.existsSync(path.join(targetDir, ...file.relativePath.split('/'))),
  );

  if (existing.length > 0 && !flags.force) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${existing.map((file) => file.relativePath).join(' and ')} already exist${existing.length > 1 ? '' : 's'}.`,
      'These are yours to edit, so they are never overwritten silently — pass --force to replace them.',
    );
  }

  if (!flags.dryRun) {
    for (const file of files) {
      const full = path.join(targetDir, ...file.relativePath.split('/'));
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, file.content, 'utf8');
    }
  }

  reporter.ciInitSummary({
    targetDir,
    files: files.map((file) => file.relativePath),
    dryRun: flags.dryRun,
  });

  return 0;
}
