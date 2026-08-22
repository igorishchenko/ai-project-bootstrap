import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parseImplementFlags, resolveFeatureContent, runImplement } from '../src/cli/implement.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { loadFeatures, type LoadedFeature } from '../src/core/registry/loadFeatures.js';
import { builders } from '../src/builders/index.js';
import { CONFIG_FILENAME } from '../src/builders/configBuilder.js';
import { Reporter } from '../src/cli/reporter.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function select(choices: Selection['choices']): Selection {
  return { projectName: 'Test', choices };
}

function capturingReporter(): { reporter: Reporter; output: () => string } {
  let buffer = '';
  const stream = {
    write: (chunk: string) => {
      buffer += chunk;
      return true;
    },
  } as unknown as NodeJS.WriteStream;
  return { reporter: new Reporter(stream), output: () => buffer };
}

describe('parseImplementFlags', () => {
  it('reads the feature id as the first bare argument', () => {
    expect(parseImplementFlags(['authentication'])).toMatchObject({
      featureId: 'authentication',
      dryRun: false,
      help: false,
    });
  });

  it('reads --dir and --dry-run', () => {
    expect(parseImplementFlags(['authentication', '--dir', './my-app', '--dry-run'])).toMatchObject(
      {
        featureId: 'authentication',
        dir: './my-app',
        dryRun: true,
      },
    );
  });

  it('reads --list-features', () => {
    expect(parseImplementFlags(['--list-features']).listFeatures).toBe(true);
  });

  it('reads -h and --help', () => {
    expect(parseImplementFlags(['-h']).help).toBe(true);
    expect(parseImplementFlags(['--help']).help).toBe(true);
  });

  it('rejects a --dir with no value', () => {
    expect(() => parseImplementFlags(['authentication', '--dir'])).toThrow(GeneratorError);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseImplementFlags(['authentication', '--nope'])).toThrow(GeneratorError);
  });
});

describe('resolveFeatureContent', () => {
  const feature: LoadedFeature = {
    manifest: {
      id: 'authentication',
      name: 'Authentication',
      description: 'x',
      category: 'auth',
      providers: ['supabase-auth'],
    },
    root: '/virtual',
    providers: new Map([
      ['supabase-auth', { plan: 'Plan', checklist: 'Checklist', prompts: [], scaffold: [] }],
    ]),
  };

  it('resolves the provider named by the selection', () => {
    const result = resolveFeatureContent(feature, { auth: 'supabase-auth' });
    expect(result.providerId).toBe('supabase-auth');
    expect(result.content.plan).toBe('Plan');
  });

  it('throws when the category was never answered', () => {
    expect(() => resolveFeatureContent(feature, {})).toThrow(/has no "auth" technology selected/);
  });

  it('throws when the category was explicitly answered "none"', () => {
    expect(() => resolveFeatureContent(feature, { auth: 'none' })).toThrow(
      /has no "auth" technology selected/,
    );
  });

  it('throws, naming the supported providers in the hint, when the selected one has no content', () => {
    let error: unknown;
    try {
      resolveFeatureContent(feature, { auth: 'clerk' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(GeneratorError);
    expect((error as GeneratorError).message).toMatch(
      /No "authentication" content yet for "clerk"/,
    );
    expect((error as GeneratorError).hint).toMatch(/supabase-auth/);
  });
});

describe('implement, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function freshProject(selection: Selection): string {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'implement-test-'));
    dirs.push(targetDir);
    const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    result.vfs.flush(targetDir, { force: true });
    return targetDir;
  }

  it('errors when the target has no ai-project.config.json', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'implement-test-'));
    dirs.push(targetDir);
    const { reporter } = capturingReporter();

    await expect(
      runImplement(['authentication', '--dir', targetDir], ROOT, reporter),
    ).rejects.toThrow(new RegExp(CONFIG_FILENAME));
  });

  it('errors when no feature id is given', async () => {
    const { reporter } = capturingReporter();
    await expect(runImplement([], ROOT, reporter)).rejects.toThrow(/needs a feature id/);
  });

  it('errors on an unknown feature id, listing the real ones', async () => {
    const { reporter } = capturingReporter();
    await expect(runImplement(['not-a-real-feature'], ROOT, reporter)).rejects.toThrow(
      /Unknown feature "not-a-real-feature"/,
    );
  });

  it('--list-features prints every real feature', async () => {
    const { reporter, output } = capturingReporter();
    const code = await runImplement(['--list-features'], ROOT, reporter);

    expect(code).toBe(0);
    for (const feature of loadFeatures(
      ROOT,
      loadRegistry(ROOT).byId,
      loadRegistry(ROOT).categories,
    )) {
      expect(output()).toContain(feature.manifest.id);
    }
  });

  it("errors clearly when the project has nothing selected for the feature's category", async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const { reporter } = capturingReporter();

    await expect(
      runImplement(['authentication', '--dir', targetDir], ROOT, reporter),
    ).rejects.toThrow(/has no "auth" technology selected/);
  });

  it('writes a plan, checklist, prompt and scaffold tailored to the selected provider', async () => {
    const targetDir = freshProject(
      select({ target: 'mobile', mobile: 'expo', auth: 'supabase-auth' }),
    );
    const { reporter, output } = capturingReporter();

    const code = await runImplement(['authentication', '--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('Supabase Auth');

    const plan = fs.readFileSync(
      path.join(targetDir, 'implementation/authentication/plan.md'),
      'utf8',
    );
    expect(plan).toContain('Test uses Supabase Auth'); // {{projectName}} rendered
    expect(fs.existsSync(path.join(targetDir, 'implementation/authentication/checklist.md'))).toBe(
      true,
    );
    expect(
      fs.existsSync(path.join(targetDir, 'implementation/authentication/prompts/implement.md')),
    ).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'src/features/auth/authClient.ts'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'src/hooks/auth/useAuth.ts'))).toBe(true);
  });

  it('produces meaningfully different content for a different provider — the whole point', async () => {
    const targetDir = freshProject(select({ target: 'mobile', mobile: 'expo', auth: 'clerk' }));
    const { reporter } = capturingReporter();

    await runImplement(['authentication', '--dir', targetDir], ROOT, reporter);

    const plan = fs.readFileSync(
      path.join(targetDir, 'implementation/authentication/plan.md'),
      'utf8',
    );
    expect(plan).toContain('Clerk');
    expect(plan).not.toContain('Supabase');
    // Clerk's scaffold shape differs from Supabase Auth's — no authClient.ts,
    // but a hook Supabase Auth's plan never mentions.
    expect(fs.existsSync(path.join(targetDir, 'src/features/auth/authClient.ts'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'src/hooks/auth/useAuthedFetch.ts'))).toBe(true);
  });

  it('re-running preserves a hand-edited scaffold file and reports it', async () => {
    const targetDir = freshProject(
      select({ target: 'mobile', mobile: 'expo', auth: 'supabase-auth' }),
    );
    const { reporter: first } = capturingReporter();
    await runImplement(['authentication', '--dir', targetDir], ROOT, first);

    const scaffoldPath = path.join(targetDir, 'src/features/auth/authClient.ts');
    fs.writeFileSync(
      scaffoldPath,
      `${fs.readFileSync(scaffoldPath, 'utf8')}\n// MY EDIT\n`,
      'utf8',
    );

    const { reporter: second, output } = capturingReporter();
    const code = await runImplement(['authentication', '--dir', targetDir], ROOT, second);

    expect(code).toBe(0);
    expect(output()).toContain('Kept your edits');
    expect(output()).toContain('src/features/auth/authClient.ts');
    expect(fs.readFileSync(scaffoldPath, 'utf8')).toContain('// MY EDIT');
  });

  // The first run has no manifest, so every scaffold path is unrecorded — which
  // used to mean "write straight over it". These paths are in the project's
  // ordinary source layout, where an archetype's working code and anything
  // started by hand already live.
  it('never overwrites a file that was already there and it never wrote', async () => {
    const targetDir = freshProject(
      select({ target: 'mobile', mobile: 'expo', auth: 'supabase-auth' }),
    );

    const existing = path.join(targetDir, 'src/hooks/auth/useAuth.ts');
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, 'export function useAuth() {\n  return { signedIn: true };\n}\n');

    const { reporter, output } = capturingReporter();
    const code = await runImplement(['authentication', '--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(fs.readFileSync(existing, 'utf8')).toContain('signedIn');
    expect(output()).toContain('Skipped the scaffold');
    expect(output()).toContain('src/hooks/auth/useAuth.ts');

    // All of it, not just the colliding file: the scaffold's files call each
    // other, and the half that happens not to collide does not compile against
    // whatever was already there.
    expect(fs.existsSync(path.join(targetDir, 'src/features/auth/authClient.ts'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'src/features/auth/screens/SignUpScreen.tsx'))).toBe(
      false,
    );

    // The plan and prompts are ours alone, and are exactly what someone
    // reconciling by hand needs — those still land.
    expect(fs.existsSync(path.join(targetDir, 'implementation/authentication/plan.md'))).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, 'implementation/authentication/prompts/implement.md')),
    ).toBe(true);
  });

  it('does not quietly apply the skipped scaffold on the next run', async () => {
    // The fingerprint manifest is written either way, so a skipped file must
    // not be recorded as though it had been written — otherwise run two treats
    // it as an ordinary refresh and produces the half-applied tree run one
    // refused to.
    const targetDir = freshProject(
      select({ target: 'mobile', mobile: 'expo', auth: 'supabase-auth' }),
    );
    const existing = path.join(targetDir, 'src/hooks/auth/useAuth.ts');
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, 'export function useAuth() {\n  return { signedIn: true };\n}\n');

    const { reporter: first } = capturingReporter();
    await runImplement(['authentication', '--dir', targetDir], ROOT, first);

    const { reporter: second, output } = capturingReporter();
    await runImplement(['authentication', '--dir', targetDir], ROOT, second);

    expect(output()).toContain('Skipped the scaffold');
    expect(fs.readFileSync(existing, 'utf8')).toContain('signedIn');
    expect(fs.existsSync(path.join(targetDir, 'src/features/auth/authClient.ts'))).toBe(false);
  });

  it('still refreshes its own scaffold on a re-run', async () => {
    // The guard keys off "we have no record of writing this", so a second run
    // must not start treating the scaffold it just wrote as somebody else's.
    const targetDir = freshProject(
      select({ target: 'mobile', mobile: 'expo', auth: 'supabase-auth' }),
    );
    const { reporter: first } = capturingReporter();
    await runImplement(['authentication', '--dir', targetDir], ROOT, first);

    const scaffoldPath = path.join(targetDir, 'src/features/auth/authClient.ts');
    const written = fs.readFileSync(scaffoldPath, 'utf8');
    fs.writeFileSync(scaffoldPath, 'wiped\n', 'utf8');
    fs.writeFileSync(scaffoldPath, written, 'utf8'); // back to exactly what we wrote

    const { reporter: second, output } = capturingReporter();
    await runImplement(['authentication', '--dir', targetDir], ROOT, second);

    expect(output()).not.toContain('already there and not written by us');
    expect(fs.readFileSync(scaffoldPath, 'utf8')).toBe(written);
  });

  it('--dry-run writes nothing to disk', async () => {
    const targetDir = freshProject(
      select({ target: 'mobile', mobile: 'expo', auth: 'supabase-auth' }),
    );
    const { reporter } = capturingReporter();

    const code = await runImplement(
      ['authentication', '--dir', targetDir, '--dry-run'],
      ROOT,
      reporter,
    );

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(targetDir, 'implementation'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'src/features/auth/authClient.ts'))).toBe(false);
  });

  it('is safe to run for a second, different feature without disturbing the first', async () => {
    const targetDir = freshProject(
      select({
        target: 'mobile',
        mobile: 'expo',
        auth: 'supabase-auth',
        payments: 'revenuecat',
      }),
    );
    const { reporter: authReporter } = capturingReporter();
    await runImplement(['authentication', '--dir', targetDir], ROOT, authReporter);

    const { reporter: paymentsReporter } = capturingReporter();
    const code = await runImplement(['payments', '--dir', targetDir], ROOT, paymentsReporter);

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(targetDir, 'implementation/authentication/plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'implementation/payments/plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'src/features/auth/authClient.ts'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'src/services/payments/purchases.ts'))).toBe(true);
  });
});
