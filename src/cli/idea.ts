import * as prompts from '@clack/prompts';
import type { Preset } from '../core/types.js';
import { GeneratorError, type GeneratorErrorCode } from '../core/resolve/errors.js';

const DEFAULT_API_URL = 'https://api.ai-project-bootstrap.com';

/**
 * Where the hosted propose-stack backend lives. Defaults to the deployed
 * service, since an installed CLI has no local backend to talk to — set
 * `AI_PROJECT_BOOTSTRAP_API_URL` to `http://localhost:8787` to develop
 * against a backend running on this machine.
 */
export function resolveApiUrl(): string {
  return process.env.AI_PROJECT_BOOTSTRAP_API_URL ?? DEFAULT_API_URL;
}

/**
 * `--idea` is Pro-only — there is no free tier and no trial, since every
 * call spends the maintainer's own OpenAI budget. Checked client-side
 * before the network call, so the common case (never subscribed) fails
 * fast with a clear message instead of a round trip that ends in the same
 * rejection anyway.
 */
export function requireLicenseKey(
  feature = '--idea',
  alternative = 'drop --idea and use --preset/the wizard instead',
): string {
  const key = process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  if (!key) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'AI_PROJECT_BOOTSTRAP_LICENSE_KEY is not set.',
      `${feature} requires an ai-project-bootstrap subscription. Set the license key you received by email, or ${alternative}.`,
    );
  }
  return key;
}

export interface IdeaProposal {
  preset: Preset;
  suggestedName?: string;
}

interface ProposeStackResponseBody {
  preset?: Preset;
  suggestedName?: string;
  reasoning?: string;
}

interface ErrorResponseBody {
  error?: { code?: string; message?: string; hint?: string };
}

/**
 * Asks the hosted backend to propose a stack for `idea` — no API key needed
 * client-side, the backend holds its own. Wraps the request in the same
 * spinner UX the direct-OpenAI version used, and prints the backend's
 * rationale via `prompts.note` before returning, so the wizard's
 * preset-review confirm step is the only thing left before anything is
 * generated.
 */
export async function requestStackProposal(options: {
  idea: string;
  licenseKey: string;
}): Promise<IdeaProposal> {
  const apiUrl = resolveApiUrl();
  const spin = prompts.spinner();
  spin.start('Reading your idea…');

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1/propose-stack`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.licenseKey}`,
      },
      body: JSON.stringify({ idea: options.idea }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    spin.stop('Could not reach the ai-project-bootstrap backend.', 1);
    throw new GeneratorError(
      'IDEA_REQUEST_FAILED',
      `Could not reach ${apiUrl}: ${error instanceof Error ? error.message : String(error)}`,
      'Check your network connection and AI_PROJECT_BOOTSTRAP_API_URL, or drop --idea and use --preset/the wizard instead.',
    );
  }

  const body = (await response.json().catch(() => undefined)) as
    ProposeStackResponseBody | ErrorResponseBody | undefined;

  if (!response.ok) {
    spin.stop('The backend rejected the request.', 1);
    const errorBody = (body as ErrorResponseBody | undefined)?.error;
    throw new GeneratorError(
      (errorBody?.code as GeneratorErrorCode | undefined) ?? 'IDEA_REQUEST_FAILED',
      errorBody?.message ?? `The backend returned ${response.status}.`,
      errorBody?.hint ??
        'Try rephrasing your idea, or drop --idea and use --preset/the wizard instead.',
    );
  }

  const result = body as ProposeStackResponseBody | undefined;
  if (!result?.preset) {
    spin.stop('The backend returned an unexpected response.', 1);
    throw new GeneratorError(
      'IDEA_REQUEST_FAILED',
      'The backend response was missing a proposed stack.',
      'Try rephrasing your idea, or drop --idea and use --preset/the wizard instead.',
    );
  }

  spin.stop('Got a proposal.');

  if (result.reasoning) {
    prompts.note(result.reasoning, 'Why this stack');
  }

  return { preset: result.preset, suggestedName: result.suggestedName };
}
