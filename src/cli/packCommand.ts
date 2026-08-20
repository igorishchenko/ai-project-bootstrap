import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { GeneratorError } from '../core/resolve/errors.js';
import type { Reporter } from './reporter.js';
import { runPackAdd, runPackList, runPackUpdate } from './pack.js';

export const PACK_HELP_TEXT = `Usage: ai-project-bootstrap pack <command> [options]

  pack add <slug>[@version]   Fetch an organisation rule pack, cache it, and pin it
  pack update [slug]          Move the pin to the newest published version
  pack list                   What this project pins, and what is cached here

Options:
  --dir <path>                The project directory (default: the current one)
  -h, --help                  Show this help

A pack is pinned to an exact version. \`@latest\` is deliberately not offered:
two runs of the same command must produce the same files. Fetching needs a
licence key and network; generating, \`check\` and \`upgrade\` read the local
cache and never the network.
`;

/**
 * Writes the pinned set back into `ai-project.config.json`.
 *
 * Deliberately a surgical edit rather than a regeneration: the file also holds
 * every other file's fingerprint, and rewriting it from a fresh build would
 * mean running the whole pipeline just to change one array. The `generated` map
 * is left exactly as it was — the rule files on disk have not changed yet, and
 * claiming otherwise would make the next `check` lie in both directions.
 */
export function writePinnedPacks(configPath: string, packs: string[]): void {
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  // Rebuilt key by key so `packs` lands in a stable place rather than at the
  // end, where it would move every time something else was added.
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'packs') continue;
    if (key === 'generated' && packs.length > 0) next.packs = packs;
    next[key] = value;
  }
  if (packs.length > 0 && next.packs === undefined) next.packs = packs;

  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`);
}

function targetDirFrom(argv: string[]): string {
  const index = argv.indexOf('--dir');
  const value = index >= 0 ? argv[index + 1] : undefined;
  return path.resolve(value ?? process.cwd());
}

export async function runPack(argv: string[], reporter: Reporter): Promise<number> {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    reporter.plain(PACK_HELP_TEXT);
    return 0;
  }

  const [subcommand, ...rest] = argv;
  const targetDir = targetDirFrom(rest);
  const configPath = path.join(targetDir, CONFIG_FILENAME);

  try {
    if (!fs.existsSync(configPath)) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `No ${CONFIG_FILENAME} in ${targetDir}.`,
        'Rule packs apply to a project this tool generated. Run it from that project, or pass --dir.',
      );
    }

    const result =
      subcommand === 'list'
        ? runPackList(targetDir)
        : subcommand === 'add'
          ? await runPackAdd(targetDir, requireSlug(rest, 'add'))
          : subcommand === 'update'
            ? await runPackUpdate(targetDir, optionalSlug(rest))
            : unknownSubcommand(subcommand);

    if (result.packs) {
      writePinnedPacks(configPath, result.packs);
      result.lines.push(
        '',
        'Run `ai-project-bootstrap upgrade` to write the pack’s rules into this project.',
      );
    }

    for (const line of result.lines) reporter.plain(line);
    return 0;
  } catch (error) {
    reporter.failure(error);
    return 1;
  }
}

function requireSlug(argv: string[], subcommand: string): string {
  const slug = argv.find((arg) => !arg.startsWith('--'));
  if (!slug) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `pack ${subcommand} needs a pack slug.`,
      'For example: ai-project-bootstrap pack add acme-standards',
    );
  }
  return slug;
}

function optionalSlug(argv: string[]): string | undefined {
  return argv.find((arg) => !arg.startsWith('--'));
}

function unknownSubcommand(subcommand: string | undefined): never {
  throw new GeneratorError(
    'INVALID_CONFIG',
    `Unknown pack command: ${subcommand ?? '(none)'}.`,
    'Try `pack add`, `pack update` or `pack list`.',
  );
}
