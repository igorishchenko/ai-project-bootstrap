import fs from 'node:fs';
import path from 'node:path';
import { builders } from '../builders/index.js';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { AI_TOOLS, AI_TOOLS_CATEGORY, DEFAULT_AI_TOOLS } from '../builders/ruleSources.js';
import { generate } from '../core/pipeline/generate.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { preservedPaths, readFingerprints } from '../core/vfs/preserve.js';
import { loadSelectionFile, readPinnedPacks, readRecordedGeneratorVersion } from './configFile.js';
import { loadPinnedPacks } from '../core/packs/packCache.js';
import type { Reporter } from './reporter.js';

export interface UpgradeFlags {
  dir?: string;
  dryRun: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--dry-run', '-h', '--help']);
const VALUED = new Set(['--dir']);

/** Parses `upgrade`'s own small flag set — deliberately separate from the main parser. */
export function parseUpgradeFlags(argv: string[]): UpgradeFlags {
  const flags: UpgradeFlags = { dryRun: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--dry-run') flags.dryRun = true;
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
      'Run `ai-project-bootstrap upgrade --help` to see every flag.',
    );
  }

  return flags;
}

export const UPGRADE_HELP_TEXT = `
ai-project-bootstrap upgrade — refresh a generated project's output to match the installed version.

Usage
  npx ai-project-bootstrap upgrade [options]

Reloads the project's ai-project.config.json and regenerates with the exact
same selection — no question is asked, and nothing is added to or removed
from the stack. Anything you have hand-edited since it was generated is
detected by fingerprint and left alone, the same as \`add\`.

Options
      --dir <path>   Project to upgrade (default: the current directory)
      --dry-run      Show what would change without touching disk
  -h, --help          Show this help

Use \`add <technology-id>\` to bring in something new instead — \`upgrade\` only
refreshes output for what is already selected.
`.trim();

/** Every AI tool not in the project's own recorded (or default) selection. */
function newlySupportedAiTools(choices: Record<string, string | string[]>): string[] {
  const recorded = choices[AI_TOOLS_CATEGORY];
  const known = new Set(
    recorded === undefined ? DEFAULT_AI_TOOLS : Array.isArray(recorded) ? recorded : [recorded],
  );
  return AI_TOOLS.filter((tool) => !known.has(tool));
}

export async function runUpgrade(
  argv: string[],
  rootDir: string,
  reporter: Reporter,
): Promise<number> {
  const flags = parseUpgradeFlags(argv);

  if (flags.help) {
    reporter.plain(UPGRADE_HELP_TEXT);
    return 0;
  }

  const registry = loadRegistry(rootDir);
  const targetDir = path.resolve(flags.dir ?? process.cwd());
  const configFile = path.join(targetDir, CONFIG_FILENAME);

  if (!fs.existsSync(configFile)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `No ${CONFIG_FILENAME} found in ${targetDir}.`,
      'This must be a project ai-project-bootstrap already generated. Pass --dir to point at one.',
    );
  }

  const selection = loadSelectionFile(configFile);
  const fromVersion = readRecordedGeneratorVersion(configFile) ?? 'an earlier version';
  const toVersion = readGeneratorPackageInfo(rootDir).version;

  reporter.intro(toVersion);
  reporter.plain(`Upgrading ${selection.projectName} — ${fromVersion} → ${toVersion}…\n`);

  const result = generate({
    rootDir,
    targetDir,
    selection,
    builders,
    registry,
    // A pinned pack that is not cached refuses here rather than regenerating
    // without the organisation's rules — that would report every rule file as
    // drifted and quietly drop the standards at the same time.
    packs: loadPinnedPacks(readPinnedPacks(configFile)),
    generatorVersion: toVersion,
    onBuilder: (run) => reporter.step(run),
  });

  // Same safety net as `add`: anything whose contents no longer match what
  // was recorded at generation is the user's, not ours.
  const preserve = new Set(
    preservedPaths(targetDir, result.vfs.snapshot().files, readFingerprints(configFile)),
  );

  const flushed = result.vfs.flush(targetDir, {
    dryRun: flags.dryRun,
    // The target is necessarily an existing, non-empty project — that is the
    // whole point of `upgrade` — so the "don't write into a non-empty
    // directory" guard would always trip otherwise.
    force: true,
    preserve,
  });

  reporter.upgradeSummary({
    targetDir,
    fromVersion,
    toVersion,
    added: flushed.added,
    updated: flushed.updated,
    unchanged: flushed.unchanged,
    preserved: flushed.preserved,
    newProviders: newlySupportedAiTools(selection.choices),
    warnings: result.warnings,
    dryRun: flags.dryRun,
  });

  return 0;
}
