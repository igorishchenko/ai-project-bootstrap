import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { fingerprint } from '../src/core/vfs/fingerprint.js';
import { normalizePackPath } from '../src/builders/packBuilder.js';
import { RULE_FILE_TOOLS, previewRule } from '../src/builders/ruleDialects.js';
import {
  listCachedPacks,
  loadPinnedPacks,
  readCachedPack,
  writeCachedPack,
} from '../src/core/packs/packCache.js';
import { packAdditions, replacedModuleIds, resolveRuleBody } from '../src/core/packs/resolve.js';
import { parsePack, parsePackRef } from '../src/core/packs/packTypes.js';
import type { RulePack, Selection } from '../src/core/types.js';
import { pinPack } from '../src/cli/pack.js';
import { runCheck } from '../src/cli/check.js';
import { runUpgrade } from '../src/cli/upgrade.js';
import { CONFIG_FILENAME } from '../src/builders/configBuilder.js';
import { Reporter } from '../src/cli/reporter.js';

/** Same shape the other CLI tests use — a Reporter writing into a string. */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

const selection = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests/fixtures/expo-supabase-revenuecat.json'), 'utf8'),
) as Selection;

/** A pack exercising all three things a pack can do, plus a doc and a checklist. */
const acme: RulePack = {
  id: 'acme-standards',
  name: 'Acme engineering standards',
  version: '2.1.0',
  rules: [
    {
      id: 'logging',
      name: 'Logging at Acme',
      appliesTo: ['*'],
      content: '# Logging\n\nUse `pino`. Never `console.log` in committed code.',
    },
    {
      id: 'supabase-extras',
      name: 'Supabase at Acme',
      extends: 'supabase',
      content: '## Acme additions\n\nAlways enable Row Level Security before the first deploy.',
    },
    {
      id: 'expo-house-style',
      name: 'Expo at Acme',
      replaces: 'expo',
      content: '# Expo, the Acme way\n\nEAS only. No bare workflow.',
    },
    {
      id: 'django-only',
      name: 'Django at Acme',
      appliesTo: ['django'],
      content: '# Django\n\nNot selected by this project, so this must not appear.',
    },
  ],
  docs: [{ path: 'docs/acme-review.md', content: '# Acme review\n\nTwo approvals.' }],
  checklists: [{ path: 'checklists/acme-launch.md', content: '# Launch\n\n- [ ] Sign-off' }],
};

function run(packs: RulePack[] = []) {
  return generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
    packs,
    generatorVersion: '9.9.9',
  });
}

describe('pack references', () => {
  it('parses a pinned reference', () => {
    expect(parsePackRef('acme-standards@2.1.0')).toEqual({
      slug: 'acme-standards',
      version: '2.1.0',
    });
  });

  /**
   * The determinism promise, enforced at the only place it can be. A rule that
   * changed underneath two runs of the same command would break it quietly —
   * the output would still look plausible.
   */
  it('refuses @latest, and says why', () => {
    expect(() => parsePackRef('acme-standards@latest')).toThrow(GeneratorError);
    expect(() => parsePackRef('acme-standards@latest')).toThrow(/latest/);
  });

  it('refuses a range', () => {
    expect(() => parsePackRef('acme-standards@^2.1.0')).toThrow(GeneratorError);
  });

  it('refuses a bare slug with no version', () => {
    expect(() => parsePackRef('acme-standards')).toThrow(GeneratorError);
  });

  it('replaces an existing pin for the same slug rather than stacking one', () => {
    expect(
      pinPack([{ slug: 'acme-standards', version: '2.0.0' }], {
        slug: 'acme-standards',
        version: '2.1.0',
      }),
    ).toEqual(['acme-standards@2.1.0']);
  });
});

describe('pack schema', () => {
  it('refuses a rule that both extends and replaces', () => {
    expect(() =>
      parsePack(
        {
          id: 'x',
          name: 'X',
          version: '1.0.0',
          rules: [{ id: 'r', name: 'R', extends: 'a', replaces: 'b', content: 'c' }],
        },
        'test',
      ),
    ).toThrow(GeneratorError);
  });

  it('refuses a rule that does none of the three', () => {
    expect(() =>
      parsePack(
        { id: 'x', name: 'X', version: '1.0.0', rules: [{ id: 'r', name: 'R', content: 'c' }] },
        'test',
      ),
    ).toThrow(GeneratorError);
  });

  it('refuses an unpinned version', () => {
    expect(() => parsePack({ id: 'x', name: 'X', version: '1.0' }, 'test')).toThrow(GeneratorError);
  });
});

describe('resolution', () => {
  const selected = new Set(['expo', 'supabase', 'react-native']);

  it('adds a rule that applies to every project', () => {
    const ids = packAdditions([acme], selected).map((addition) => addition.id);
    expect(ids).toContain('acme-standards-logging');
  });

  it('omits a rule scoped to a module this project did not select', () => {
    const ids = packAdditions([acme], selected).map((addition) => addition.id);
    expect(ids).not.toContain('acme-standards-django-only');
  });

  it('appends an extension below ours rather than replacing it', () => {
    const resolved = resolveRuleBody('supabase', '# Ours\n\nThe built-in guidance.', [acme]);
    expect(resolved.body).toMatch(/^# Ours/);
    expect(resolved.body).toContain('Row Level Security');
    expect(resolved.extendedBy).toEqual(['acme-standards']);
    expect(resolved.replacedBy).toBeUndefined();
  });

  it('drops ours entirely on a replace, and names the pack that did it', () => {
    const resolved = resolveRuleBody('expo', '# Ours\n\nThe built-in guidance.', [acme]);
    expect(resolved.body).not.toContain('The built-in guidance.');
    expect(resolved.body).toContain('EAS only');
    expect(resolved.replacedBy).toBe('acme-standards');
  });

  it('leaves an untouched rule byte-identical', () => {
    const body = '# Untouched\n\nExactly as authored.';
    expect(resolveRuleBody('posthog', body, [acme]).body).toBe(body);
  });

  it('reports what was replaced, so an advisory that does not apply is explainable', () => {
    expect(replacedModuleIds([acme]).get('expo')).toBe('acme-standards');
  });
});

describe('generation with a pack', () => {
  const withPack = run([acme]);
  const read = (file: string): string => {
    const content = withPack.vfs.read(file);
    expect(content, `${file} should exist`).toBeDefined();
    return content as string;
  };

  it('writes an added rule for every enabled AI tool', () => {
    // The fixture selects no `aiTools`, so the default (Cursor + Claude) applies.
    expect(read('.cursor/rules/acme-standards-logging.mdc')).toContain('pino');
    expect(read('.claude/skills/acme-standards-logging/SKILL.md')).toContain('pino');
  });

  it('appends an extension into the built-in rule file', () => {
    const rule = read('.cursor/rules/supabase.mdc');
    expect(rule).toContain('Row Level Security before the first deploy');
    // Ours is still there — an extension is an addition, not a substitution.
    expect(rule.indexOf('Row Level Security before the first deploy')).toBeGreaterThan(100);
  });

  it('replaces the built-in rule where a pack says so', () => {
    expect(read('.cursor/rules/expo.mdc')).toContain('EAS only');
  });

  it('writes a pack’s docs and checklists', () => {
    expect(read('docs/acme-review.md')).toContain('Two approvals');
    expect(read('checklists/acme-launch.md')).toContain('Sign-off');
  });

  it('pins the pack version into the config', () => {
    const config = JSON.parse(read('ai-project.config.json')) as { packs?: string[] };
    expect(config.packs).toEqual(['acme-standards@2.1.0']);
  });

  it('records no packs key at all for a project that has none', () => {
    const config = JSON.parse(run().vfs.read('ai-project.config.json') as string) as {
      packs?: string[];
    };
    expect(config.packs).toBeUndefined();
  });

  /**
   * Requirement 2, proved rather than argued.
   *
   * Every pack-derived file must be fingerprinted like any other generated
   * file. If it were not, `check` would recompute it, find no recorded
   * fingerprint, and report it — so every repository using a pack would show
   * permanent drift and the report would become noise.
   */
  it('fingerprints pack-derived files exactly like generated ones', () => {
    const config = JSON.parse(read('ai-project.config.json')) as {
      generated: Record<string, string>;
    };

    for (const file of [
      '.cursor/rules/acme-standards-logging.mdc',
      '.claude/skills/acme-standards-logging/SKILL.md',
      'docs/acme-review.md',
      'checklists/acme-launch.md',
      '.cursor/rules/supabase.mdc',
      '.cursor/rules/expo.mdc',
    ]) {
      expect(config.generated[file], `${file} should be fingerprinted`).toBe(
        fingerprint(read(file)),
      );
    }
  });

  /** The same inputs twice must produce the same bytes — that is what `check` compares. */
  it('is deterministic, so a second run reports nothing behind', () => {
    const again = run([acme]);
    for (const file of withPack.vfs.snapshot().files) {
      expect(again.vfs.read(file), file).toBe(withPack.vfs.read(file));
    }
  });

  it('changes the rule files, so a pack is not a no-op', () => {
    const without = run();
    expect(without.vfs.read('.cursor/rules/expo.mdc')).not.toBe(
      withPack.vfs.read('.cursor/rules/expo.mdc'),
    );
    expect(without.vfs.read('.cursor/rules/acme-standards-logging.mdc')).toBeUndefined();
  });
});

describe('pack file paths', () => {
  it('rejects traversal and absolute paths', () => {
    expect(normalizePackPath('../outside.md')).toBeUndefined();
    expect(normalizePackPath('docs/../../outside.md')).toBeUndefined();
    expect(normalizePackPath('/etc/passwd')).toBeUndefined();
    expect(normalizePackPath('C:\\Windows\\system32')).toBeUndefined();
  });

  it('accepts an ordinary relative path', () => {
    expect(normalizePackPath('./docs/acme.md')).toBe('docs/acme.md');
  });

  it('warns rather than writing outside the project', () => {
    const escaping: RulePack = {
      ...acme,
      docs: [{ path: '../escaped.md', content: 'no' }],
      checklists: [],
    };
    const result = run([escaping]);
    expect(result.warnings.join('\n')).toContain('outside the project');
  });
});

describe('the cache', () => {
  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-packs-'));
    env = { AI_PROJECT_BOOTSTRAP_PACK_DIR: dir };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips a pack', () => {
    writeCachedPack(acme, env);
    expect(readCachedPack({ slug: 'acme-standards', version: '2.1.0' }, env)).toEqual(acme);
  });

  it('lists what is cached', () => {
    writeCachedPack(acme, env);
    expect(listCachedPacks(env)).toEqual([{ slug: 'acme-standards', version: '2.1.0' }]);
  });

  it('treats a corrupt entry as a miss rather than a crash', () => {
    writeCachedPack(acme, env);
    fs.writeFileSync(path.join(dir, 'acme-standards@2.1.0.json'), '{ not json');
    expect(readCachedPack({ slug: 'acme-standards', version: '2.1.0' }, env)).toBeUndefined();
  });

  /**
   * The failure that matters most. Generating without a pinned pack would drop
   * the organisation's standards *and* invalidate every fingerprint recorded
   * with them — one failure invisible, the other pure noise.
   */
  it('refuses to generate when a pinned pack is not cached', () => {
    expect(() => loadPinnedPacks([{ slug: 'acme-standards', version: '2.1.0' }], env)).toThrow(
      GeneratorError,
    );
    expect(() => loadPinnedPacks([{ slug: 'acme-standards', version: '2.1.0' }], env)).toThrow(
      /not available offline/,
    );
  });

  it('names the command that fixes it', () => {
    try {
      loadPinnedPacks([{ slug: 'acme-standards', version: '2.1.0' }], env);
      expect.unreachable();
    } catch (error) {
      expect((error as GeneratorError).hint).toContain('pack add acme-standards');
    }
  });

  it('is satisfied once the pack is cached', () => {
    writeCachedPack(acme, env);
    expect(loadPinnedPacks([{ slug: 'acme-standards', version: '2.1.0' }], env)).toHaveLength(1);
  });
});

/**
 * The acceptance criteria, on a real filesystem.
 *
 * `generate()` is pure and the tests above exercise it in memory, but the
 * question requirement 2 actually asks — does a packed project report clean —
 * is about `check` reading a config off disk and recomputing from a cache. That
 * has three moving parts the in-memory tests cannot see.
 */
describe('check and upgrade on a packed project', () => {
  const dirs: string[] = [];
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-packcache-'));
    process.env.AI_PROJECT_BOOTSTRAP_PACK_DIR = cacheDir;
    writeCachedPack(acme);
  });

  afterEach(() => {
    delete process.env.AI_PROJECT_BOOTSTRAP_PACK_DIR;
    fs.rmSync(cacheDir, { recursive: true, force: true });
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function packedProject(): string {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-packed-'));
    dirs.push(targetDir);
    const result = generate({
      rootDir: ROOT,
      targetDir,
      selection,
      builders,
      registry,
      packs: [acme],
    });
    result.vfs.flush(targetDir, { force: true });
    return targetDir;
  }

  it('reports a freshly generated packed project as up to date', async () => {
    const targetDir = packedProject();
    const { reporter, output } = capturingReporter();

    const code = await runCheck(['--dir', targetDir], ROOT, reporter);

    expect(output()).toContain('Up to date.');
    expect(code).toBe(0);
  });

  it('refreshes a pack-derived file that drifted', async () => {
    const targetDir = packedProject();
    const rule = path.join(targetDir, '.cursor', 'rules', 'acme-standards-logging.mdc');

    // Behind: different on disk, but matching the recorded fingerprint, so
    // nothing reads it as a hand edit.
    const stale = '# Logging\n\nAn older version of the pack said something else.\n';
    fs.writeFileSync(rule, stale);
    const configPath = path.join(targetDir, CONFIG_FILENAME);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      generated: Record<string, string>;
    };
    config.generated['.cursor/rules/acme-standards-logging.mdc'] = fingerprint(stale);
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

    await runUpgrade(['--dir', targetDir], ROOT, capturingReporter().reporter);

    expect(fs.readFileSync(rule, 'utf8')).toContain('pino');
  });

  it('leaves a hand-edited pack file alone — hand edits beat everything', async () => {
    const targetDir = packedProject();
    const rule = path.join(targetDir, '.cursor', 'rules', 'acme-standards-logging.mdc');
    const mine = '# Logging\n\nMy own words, which upgrade must never take away.\n';
    fs.writeFileSync(rule, mine);

    await runUpgrade(['--dir', targetDir], ROOT, capturingReporter().reporter);

    expect(fs.readFileSync(rule, 'utf8')).toBe(mine);
  });

  /**
   * The alternative would be a `check` that regenerated without the pack,
   * found every rule file different, and reported the whole project as
   * drifted — while also having quietly dropped the organisation's standards.
   * Refusing is the only honest answer, and it reaches the user as the CLI's
   * ordinary error output rather than a stack trace.
   */
  it('refuses rather than silently generating without a pinned pack', async () => {
    const targetDir = packedProject();
    fs.rmSync(path.join(cacheDir, 'acme-standards@2.1.0.json'));

    await expect(
      runCheck(['--dir', targetDir], ROOT, capturingReporter().reporter),
    ).rejects.toThrow(/not available offline/);
  });
});

/**
 * The preview the pack editor shows.
 *
 * It matters that this is the *same* function the builders render through: a
 * preview that drifts from the output is worse than no preview, because it is
 * believed. These assertions pin the two together.
 */
describe('previewRule', () => {
  const source = {
    id: 'acme-standards-logging',
    name: 'Logging at Acme',
    description: 'How we log.',
    globs: ['src/**/*.ts'],
    alwaysApply: false,
    body: '# Logging\n\nUse `pino`.',
    isBase: false,
  };

  it('gives each tool its own path and frontmatter', () => {
    expect(previewRule(source, 'cursor').path).toBe('.cursor/rules/acme-standards-logging.mdc');
    expect(previewRule(source, 'claude').path).toBe(
      '.claude/skills/acme-standards-logging/SKILL.md',
    );
    expect(previewRule(source, 'continue').content).toContain('name: "Logging at Acme"');
    expect(previewRule(source, 'claude').content).toContain('paths: ["src/**/*.ts"]');
    // Cline and Roo take a plain body — there is nothing to synthesise.
    expect(previewRule(source, 'cline').content.startsWith('# Logging')).toBe(true);
  });

  it('matches what the builders actually write', () => {
    const generated = run([acme]);
    for (const [tool, file] of [
      ['cursor', '.cursor/rules/acme-standards-logging.mdc'],
      ['claude', '.claude/skills/acme-standards-logging/SKILL.md'],
    ] as const) {
      const rule = acme.rules.find((entry) => entry.id === 'logging')!;
      const preview = previewRule(
        {
          id: 'acme-standards-logging',
          name: rule.name,
          description: `${acme.name}: ${rule.name}`,
          globs: rule.globs,
          alwaysApply: rule.globs === undefined,
          body: rule.content,
          isBase: false,
        },
        tool,
      );
      expect(preview.content, tool).toBe(generated.vfs.read(file));
    }
  });

  it('covers every tool that receives a file per rule, and no others', () => {
    // `gemini-cli` is a real `aiTools` option with no per-rule output — it gets
    // the unconditional GEMINI.md. Previewing a path nothing writes would be a
    // lie the editor tells confidently.
    expect(RULE_FILE_TOOLS).not.toContain('gemini-cli');
    for (const tool of RULE_FILE_TOOLS) {
      expect(() => previewRule(source, tool), tool).not.toThrow();
    }
  });
});
