import { GeneratorError } from '../core/resolve/errors.js';

export interface CliFlags {
  out?: string;
  config?: string;
  name?: string;
  preset?: string;
  archetype?: string;
  idea?: string;
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
const VALUED = new Set([
  '--out',
  '--config',
  '--name',
  '--skip',
  '--preset',
  '--archetype',
  '--idea',
]);

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
      if (arg === '--archetype') flags.archetype = value;
      if (arg === '--idea') flags.idea = value;
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
  npx ai-project-bootstrap check [options]
  npx ai-project-bootstrap ci init [options]
  npx ai-project-bootstrap upgrade [options]
  npx ai-project-bootstrap implement <feature-id> [options]
  npx ai-project-bootstrap review [options]
  npx ai-project-bootstrap analyze [options]
  npx ai-project-bootstrap doctor [options]
  npx ai-project-bootstrap login [options]
  npx ai-project-bootstrap logout

Every command is also available as \`apb\` — \`apb check\` is the same thing,
and shorter for something worth running weekly.

The project name doubles as its location: answer "my-app" to generate ./my-app,
or "./apps/my-app" to create that folder and name the project "my-app".

Already have a generated project and want one more technology in it? Run
\`ai-project-bootstrap add <technology-id>\` inside it instead of starting over —
see \`ai-project-bootstrap add --help\` for details.

Wondering whether this project's rules still say what we'd write today? Run
\`ai-project-bootstrap check\` inside it — a read-only report, safe in CI, that
never counts files you've edited as drift. See \`check --help\`.

Want that answered without remembering to ask? \`ai-project-bootstrap ci init\`
writes two GitHub Actions workflows: one comments the drift on every pull
request, the other opens a pull request when there is something to refresh.

Package updated since you generated? Run \`ai-project-bootstrap upgrade\` inside
the project to refresh its rules, prompts and docs against the same selection
— see \`ai-project-bootstrap upgrade --help\`.

Ready to build a specific feature — authentication, payments, push
notifications — tailored to the stack you picked? Run
\`ai-project-bootstrap implement <feature-id>\` inside the project — see
\`ai-project-bootstrap implement --help\`.

Want a static, AI-oriented review of what's already there — architecture,
security, performance, dx — before you ship? Run \`ai-project-bootstrap review\`
inside the project — see \`ai-project-bootstrap review --help\`.

Have a repo this tool never generated and want the same kind of scored,
prioritized feedback? Run \`ai-project-bootstrap analyze\` inside it — see
\`ai-project-bootstrap analyze --help\`.

Not sure this machine can build the stack you have in mind? Run
\`ai-project-bootstrap doctor\` first — see \`ai-project-bootstrap doctor --help\`.

Want more than a stack — a real, running starting point for a specific kind
of app? \`--archetype <id>\` pre-fills the same way \`--preset\` does, then
layers real starter screens and a data model on top (see README's "Starter
templates" section; \`archetypes/\` lists what's installed).

Don't know which technologies you want yet? \`--idea "<description>"\` sends
your idea to a hosted service and proposes a stack, shown for review exactly
like a preset before anything is written. This is a Pro feature — run
\`ai-project-bootstrap login\` once and it works from then on. Set
AI_PROJECT_BOOTSTRAP_API_URL to point at your own backend if you're running
one. Combining --idea with --yes skips that review, so it isn't recommended.

Subscribed? \`ai-project-bootstrap login\` stores your key on this machine, so
--idea and the editor assistant stop asking for it. \`logout\` removes it, and
\`login --status\` says which key is in use without printing it. Every command
that needs a key reads AI_PROJECT_BOOTSTRAP_LICENSE_KEY first and the stored
key second, so existing CI keeps working exactly as it did.

Options
  -o, --out <dir>       Where to generate the project (default: ./<project-name>)
      --name <name>     Project name or path, skips the first wizard question
      --config <file>   Replay a saved ai-project.config.json instead of asking
      --preset <id>     Start from a curated stack (see config/presets.json);
                         cannot be combined with --config, --archetype or --idea
      --archetype <id>  Start from a full app starter (stack + real starter
                         screens/data model, see archetypes/); cannot be
                         combined with --config, --preset or --idea
      --idea <text>     Propose a stack from a free-text project idea via a
                         hosted service (Pro — needs
                         AI_PROJECT_BOOTSTRAP_LICENSE_KEY); cannot be
                         combined with --config, --preset or --archetype
  -y, --yes             Accept defaults for every unanswered question
      --dry-run         Print what would be written without touching disk
      --force           Write into a non-empty directory
      --skip <ids>      Comma-separated builder ids to skip
      --list-modules    List every available technology module and exit
  -h, --help            Show this help
  -v, --version         Show the version
`.trim();
