import { GeneratorError } from '../core/resolve/errors.js';

export interface CliFlags {
  out?: string;
  config?: string;
  name?: string;
  preset?: string;
  yes: boolean;
  dryRun: boolean;
  force: boolean;
  skip: string[];
  listModules: boolean;
  help: boolean;
  version: boolean;
}

const BOOLEANS = new Set([
  '--yes',
  '--dry-run',
  '--force',
  '--list-modules',
  '--help',
  '--version',
]);
const VALUED = new Set(['--out', '--config', '--name', '--skip', '--preset']);

/** Minimal argv parser — the CLI has a dozen flags and no need for a library. */
export function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = {
    yes: false,
    dryRun: false,
    force: false,
    skip: [],
    listModules: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    let arg = argv[i] as string;
    let inlineValue: string | undefined;

    const equals = arg.indexOf('=');
    if (arg.startsWith('--') && equals !== -1) {
      inlineValue = arg.slice(equals + 1);
      arg = arg.slice(0, equals);
    }

    switch (arg) {
      case '-h':
        arg = '--help';
        break;
      case '-v':
        arg = '--version';
        break;
      case '-y':
        arg = '--yes';
        break;
      case '-o':
        arg = '--out';
        break;
      default:
        break;
    }

    if (BOOLEANS.has(arg)) {
      if (arg === '--yes') flags.yes = true;
      if (arg === '--dry-run') flags.dryRun = true;
      if (arg === '--force') flags.force = true;
      if (arg === '--list-modules') flags.listModules = true;
      if (arg === '--help') flags.help = true;
      if (arg === '--version') flags.version = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = inlineValue ?? argv[++i];
      if (value === undefined) {
        throw new GeneratorError(
          'INVALID_CONFIG',
          `${arg} needs a value.`,
          `Example: ${arg} <value>`,
        );
      }
      if (arg === '--out') flags.out = value;
      if (arg === '--config') flags.config = value;
      if (arg === '--name') flags.name = value;
      if (arg === '--preset') flags.preset = value;
      if (arg === '--skip')
        flags.skip.push(
          ...value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean),
        );
      continue;
    }

    if (arg.startsWith('-')) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `Unknown flag ${arg}.`,
        'Run --help to see every flag.',
      );
    }

    // A bare argument is the project directory, matching `npm create` habits.
    flags.out ??= arg;
  }

  return flags;
}

export const HELP_TEXT = `
ai-project-bootstrap — bootstrap the development environment for AI-assisted development.

Usage
  npx ai-project-bootstrap [directory] [options]
  npx ai-project-bootstrap add <technology-id> [options]
  npx ai-project-bootstrap upgrade [options]
  npx ai-project-bootstrap doctor [options]

The project name doubles as its location: answer "my-app" to generate ./my-app,
or "./apps/my-app" to create that folder and name the project "my-app".

Already have a generated project and want one more technology in it? Run
\`ai-project-bootstrap add <technology-id>\` inside it instead of starting over —
see \`ai-project-bootstrap add --help\` for details.

Package updated since you generated? Run \`ai-project-bootstrap upgrade\` inside
the project to refresh its rules, prompts and docs against the same selection
— see \`ai-project-bootstrap upgrade --help\`.

Not sure this machine can build the stack you have in mind? Run
\`ai-project-bootstrap doctor\` first — see \`ai-project-bootstrap doctor --help\`.

Options
  -o, --out <dir>       Where to generate the project (default: ./<project-name>)
      --name <name>     Project name or path, skips the first wizard question
      --config <file>   Replay a saved ai-project.config.json instead of asking
      --preset <id>     Start from a curated stack (see config/presets.json);
                         cannot be combined with --config
  -y, --yes             Accept defaults for every unanswered question
      --dry-run         Print what would be written without touching disk
      --force           Write into a non-empty directory
      --skip <ids>      Comma-separated builder ids to skip
      --list-modules    List every available technology module and exit
  -h, --help            Show this help
  -v, --version         Show the version
`.trim();
