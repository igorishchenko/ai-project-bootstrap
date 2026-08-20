import * as prompts from '@clack/prompts';
import { GeneratorError, type GeneratorErrorCode } from '../core/resolve/errors.js';
import {
  credentialsPath,
  maskKey,
  readStoredKey,
  removeStoredKey,
  storeKey,
} from './credentials.js';
import { resolveApiUrl, resolveLicenseKey } from './idea.js';
import type { Reporter } from './reporter.js';

export const LOGIN_HELP_TEXT = `
ai-project-bootstrap login — store your Pro license key on this machine.

Usage
  ai-project-bootstrap login [options]
  ai-project-bootstrap logout

Options
  --key <key>   The license key, instead of being prompted for it. Note that a
                key passed this way lands in your shell history.
  --status      Say whether a key is stored, and which one, without changing
                anything. Never prints a key in full.
  -h, --help    Show this help.

Where the key comes from
  Every command that needs a key looks in two places, in this order:

    1. AI_PROJECT_BOOTSTRAP_LICENSE_KEY — so CI keeps working unchanged, and so
       a key set for one run beats whatever is stored.
    2. The key stored by this command.

  The key is checked against the backend before it is stored, so a typo fails
  here rather than at first use. It is written owner-only, outside any project
  directory — a credential in a project is one \`git add -A\` from a public repo.

  Your key is on the dashboard, and was emailed to you when you subscribed.
`;

export interface LoginFlags {
  key?: string;
  status: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--status', '-h', '--help']);
const VALUED = new Set(['--key']);

export function parseLoginFlags(argv: string[]): LoginFlags {
  const flags: LoginFlags = { status: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--status') flags.status = true;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError('INVALID_CONFIG', '--key needs a value.', 'Example: --key apb_live_…');
      }
      flags.key = value.trim();
      continue;
    }

    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown flag ${arg}.`,
      'Run `ai-project-bootstrap login --help` to see every flag.',
    );
  }

  return flags;
}

interface VerifyResponseBody {
  ok?: boolean;
  status?: string;
  keyMasked?: string;
}

interface ErrorResponseBody {
  error?: { code?: string; message?: string; hint?: string };
}

/**
 * Asks the backend whether a key is live, without spending anything.
 *
 * `GET /v1/license/verify` exists for exactly this. Validating by making a real
 * `--idea` call would cost API budget, take seconds, and reject a perfectly
 * good key whenever the model was unavailable — so a bad day upstream would
 * look identical to a mistyped key.
 */
export async function verifyLicenseKey(key: string): Promise<{ status?: string }> {
  const apiUrl = resolveApiUrl();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1/license/verify`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new GeneratorError(
      'IDEA_REQUEST_FAILED',
      `Could not reach ${apiUrl}: ${error instanceof Error ? error.message : String(error)}`,
      'Check your network connection and AI_PROJECT_BOOTSTRAP_API_URL. Nothing was stored.',
    );
  }

  const body = (await response.json().catch(() => undefined)) as
    | (VerifyResponseBody & ErrorResponseBody)
    | undefined;

  if (!response.ok) {
    const error = body?.error;
    throw new GeneratorError(
      (error?.code as GeneratorErrorCode | undefined) ?? 'IDEA_REQUEST_FAILED',
      error?.message ?? `The backend rejected the key (${response.status}).`,
      error?.hint ?? 'Check the key on your dashboard. Nothing was stored.',
    );
  }

  return { status: body?.status };
}

/** `login --status`, and the tail of a successful `login`. */
function reportStatus(reporter: Reporter): void {
  const resolved = resolveLicenseKey();
  const stored = readStoredKey();
  const path = credentialsPath();

  if (!resolved) {
    reporter.plain(
      `Not logged in.\n\nRun \`ai-project-bootstrap login\` to store your key, or set AI_PROJECT_BOOTSTRAP_LICENSE_KEY.\nWould be stored at: ${path}`,
    );
    return;
  }

  const lines = [`Logged in as ${maskKey(resolved.key)}.`];
  if (resolved.source === 'env') {
    lines.push(
      '',
      'That key comes from AI_PROJECT_BOOTSTRAP_LICENSE_KEY, which takes precedence.',
      stored
        ? `A different key is also stored at ${path} — unset the variable to use it.`
        : 'Nothing is stored on disk.',
    );
  } else {
    lines.push('', `Stored at ${path}.`);
  }
  reporter.plain(lines.join('\n'));
}

export async function runLogin(argv: string[], reporter: Reporter): Promise<number> {
  const flags = parseLoginFlags(argv);

  if (flags.help) {
    reporter.plain(LOGIN_HELP_TEXT);
    return 0;
  }

  if (flags.status) {
    reportStatus(reporter);
    return 0;
  }

  let key = flags.key;

  if (!key) {
    // `password` rather than `text`: this is a credential, and it should not be
    // left on screen or in a scrollback buffer.
    const answer = await prompts.password({
      message: 'License key',
      validate: (value) => (value.trim() ? undefined : 'Paste the key you were emailed.'),
    });

    if (prompts.isCancel(answer)) {
      reporter.plain('Cancelled. Nothing was stored.');
      return 0;
    }
    key = answer.trim();
  }

  if (!key) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'No key given.',
      'Pass --key, or run `ai-project-bootstrap login` and paste it when prompted.',
    );
  }

  const spin = prompts.spinner();
  spin.start('Checking the key…');
  let status: string | undefined;
  try {
    ({ status } = await verifyLicenseKey(key));
  } catch (error) {
    spin.stop('That key was not accepted.', 1);
    throw error;
  }
  spin.stop('Key accepted.');

  const path = storeKey(key);

  reporter.plain(
    [
      `Logged in as ${maskKey(key)}${status && status !== 'active' ? ` (${status})` : ''}.`,
      '',
      `Stored at ${path}, readable only by you.`,
      '--idea, chat and the editor assistant will use it from now on.',
      'AI_PROJECT_BOOTSTRAP_LICENSE_KEY still wins where it is set, so CI is unaffected.',
    ].join('\n'),
  );
  return 0;
}

export function runLogout(argv: string[], reporter: Reporter): number {
  if (argv.includes('-h') || argv.includes('--help')) {
    reporter.plain(LOGIN_HELP_TEXT);
    return 0;
  }

  const path = credentialsPath();
  const removed = removeStoredKey();

  if (!removed) {
    reporter.plain(`No stored key to remove — nothing at ${path}.`);
  } else {
    reporter.plain(`Removed the stored key from ${path}.`);
  }

  // Said whether or not anything was removed: someone who runs `logout` and
  // then finds --idea still working has hit exactly this, and the variable is
  // not something `logout` can or should unset for them.
  if (process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY?.trim()) {
    reporter.plain(
      '\nAI_PROJECT_BOOTSTRAP_LICENSE_KEY is still set in this shell, and takes precedence.\nUnset it too if you meant to log out completely.',
    );
  }

  return 0;
}
