import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

const fixture = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests/fixtures/expo-supabase-revenuecat.json'), 'utf8'),
) as Selection;

function run(selection: Selection = fixture) {
  return generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
}

describe('generate', () => {
  const result = run();
  const files = result.vfs.snapshot().files;
  const read = (file: string): string => {
    const content = result.vfs.read(file);
    expect(content, `${file} should exist`).toBeDefined();
    return content as string;
  };

  it('auto-includes the platform required by the chosen framework', () => {
    expect(result.autoIncluded).toEqual(['react-native']);
    expect(result.moduleNames).toContain('React Native');
  });

  it('produces the documentation set the spec calls for', () => {
    for (const doc of [
      'docs/setup.md',
      'docs/architecture.md',
      'docs/deployment.md',
      'docs/testing.md',
      'docs/coding-standards.md',
      'docs/release.md',
    ]) {
      expect(files).toContain(doc);
    }
  });

  it('produces the root files an assistant reads first', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'README.md',
        'CLAUDE.md',
        'AGENTS.md',
        '.env.example',
        'package.json',
      ]),
    );
  });

  it('writes a rule and a skill for every selected technology, plus the base set', () => {
    for (const id of ['expo', 'react-native', 'supabase', 'revenuecat', 'sentry', 'posthog']) {
      expect(files).toContain(`.cursor/rules/${id}.mdc`);
      expect(files).toContain(`.claude/skills/${id}/SKILL.md`);
    }
    expect(files).toContain('.cursor/rules/typescript.mdc');
    expect(files).toContain('.claude/skills/architecture/SKILL.md');
  });

  it('writes every Claude skill in the directory shape Claude Code discovers', () => {
    const skillFiles = files.filter((file) => file.startsWith('.claude/skills/'));
    for (const file of skillFiles) {
      expect(file, `${file} must be a SKILL.md inside a skill directory`).toMatch(
        /^\.claude\/skills\/[^/]+\/SKILL\.md$/,
      );
    }
    expect(skillFiles.length).toBeGreaterThan(0);
  });

  it('gives every generated skill a description, and scopes it with the matching cursor rule globs', () => {
    const stripeSkill = read('.claude/skills/base/SKILL.md');
    expect(stripeSkill).toMatch(/^---\nname: base\ndescription: ".+"\n---\n/);

    const revenuecatSkill = read('.claude/skills/revenuecat/SKILL.md');
    const revenuecatRule = read('.cursor/rules/revenuecat.mdc');
    const globsMatch = revenuecatRule.match(/^globs:\s*(\[.*\])\s*$/m);
    expect(globsMatch).not.toBeNull();
    expect(revenuecatSkill).toContain(
      `paths: ${JSON.stringify(JSON.parse(globsMatch?.[1] ?? '[]'))}`,
    );
  });

  it('writes no rule for a technology that was not selected', () => {
    const ruleFiles = files.filter((file) => file.startsWith('.cursor/rules/'));
    expect(ruleFiles.some((file) => file.includes('firebase'))).toBe(false);
  });

  it('ships all nine base prompts', () => {
    const prompts = files.filter((file) => file.startsWith('prompts/') && file.endsWith('.md'));
    expect(prompts).toHaveLength(9);
  });

  it('gives setup.md a section per contributing module', () => {
    const setup = read('docs/setup.md');
    for (const name of ['Expo', 'Supabase', 'RevenueCat', 'Sentry', 'PostHog']) {
      expect(setup).toContain(`## ${name}`);
    }
    expect(setup).toContain('### iOS configuration');
    expect(setup).toContain('### Android configuration');
  });

  it('documents every environment variable exactly once, with a description', () => {
    const env = read('.env.example');
    const keys = [...env.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(keys).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
    expect(env).toContain('# Required');
  });

  it('resolves package.json without conflicting versions', () => {
    const pkg = JSON.parse(read('package.json')) as {
      name: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.name).toBe('demo-app');
    expect(pkg.dependencies['react-native-purchases']).toBeDefined();
    expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined();

    // Nothing may appear in both maps — npm would install the runtime one and
    // the duplicate would silently drift.
    const overlap = Object.keys(pkg.dependencies).filter((name) => name in pkg.devDependencies);
    expect(overlap).toEqual([]);
  });

  it('renders every template — no placeholder survives into the output', () => {
    for (const [file, content] of result.vfs.entries()) {
      // `{{ flex: 1 }}` in prose is JSX, not a template tag; tags have no colon.
      const tags = content.match(/\{\{[^{}:]*\}\}/g) ?? [];
      expect(tags, `${file} has unrendered tags`).toEqual([]);
    }
  });

  it('restores dotfile names from the _ template convention', () => {
    expect(files).toContain('.gitignore');
    expect(files).toContain('.husky/pre-commit');
    expect(files).toContain('.vscode/settings.json');
    expect(files).not.toContain('_gitignore');
  });

  it('keeps empty scaffolding folders, but does not litter folders with content', () => {
    expect(files).toContain('src/services/payments/.gitkeep');
    expect(files).not.toContain('docs/.gitkeep');
    expect(files).not.toContain('src/.gitkeep');
  });

  it('gives every declared script the config file it needs', () => {
    // Regression: `typecheck` shipped without a tsconfig.json, so the script
    // failed on every freshly generated project.
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    if ('typecheck' in pkg.scripts) expect(files).toContain('tsconfig.json');
    if ('lint' in pkg.scripts) expect(files).toContain('eslint.config.mjs');
    if ('format' in pkg.scripts) expect(files).toContain('.prettierrc.json');
  });

  it('leaves no declared script failing on a freshly generated project', () => {
    // Regression: `jest` exits 1 with "no tests found", and `tsc` exits 1 with
    // TS18003, on a scaffold that has no application code yet — so the first
    // CI run of every generated project was red.
    const withTests = generate({
      rootDir: ROOT,
      targetDir: '/virtual/out',
      selection: {
        projectName: 'Tested',
        choices: { target: 'mobile', mobile: 'expo', testing: ['jest'] },
      },
      builders,
      registry,
    });

    const pkg = JSON.parse(withTests.vfs.read('package.json') as string) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts.test).toContain('--passWithNoTests');
  });

  it('gives tsconfig at least one input so typecheck is not an error out of the box', () => {
    // TS18003: an include path matching nothing is a hard failure, and a fresh
    // scaffold has no application code yet.
    const tsconfig = JSON.parse(read('tsconfig.json')) as { include: string[] };
    const inputs = files.filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        tsconfig.include.some((pattern) => file.startsWith(pattern.replace(/\*.*$/, ''))),
    );

    expect(inputs.length).toBeGreaterThan(0);
  });

  it('declares every environment variable in the generated types', () => {
    const declarations = read('src/types/env.d.ts');
    const envKeys = [...read('.env.example').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);

    expect(envKeys.length).toBeGreaterThan(0);
    for (const key of envKeys) expect(declarations).toContain(`${key}?: string;`);
  });

  it('ships ESM configs with an .mjs extension, since package.json is not a module', () => {
    // Otherwise Node emits MODULE_TYPELESS_PACKAGE_JSON on every lint run.
    const pkg = JSON.parse(read('package.json')) as { type?: string };
    if (pkg.type === 'module') return;

    for (const file of files.filter((f) => /^(eslint|commitlint)\.config\./.test(f))) {
      expect(file).toMatch(/\.mjs$/);
    }
  });

  it('references no config plugin that is not also an installed dependency', () => {
    // Regression: app.json listed expo-build-properties, which nothing
    // installed, so `expo prebuild` failed.
    if (!files.includes('app.json')) return;

    const app = JSON.parse(read('app.json')) as { expo: { plugins?: unknown[] } };
    const pkg = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);

    for (const plugin of app.expo.plugins ?? []) {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      if (typeof name === 'string' && name.startsWith('expo-')) expect(installed).toContain(name);
    }
  });

  it('links only to files that exist from the root entry points', () => {
    // A README promising docs/testing.md that was never generated is worse
    // than no README — it sends the reader somewhere that is not there.
    for (const entry of ['README.md', 'CLAUDE.md', 'AGENTS.md']) {
      const content = read(entry);
      // Both styles count: markdown links, and paths quoted in backticks.
      const referenced = [
        ...[...content.matchAll(/\]\(([^)#:]+\.md)\)/g)].map((match) => match[1] as string),
        ...[...content.matchAll(/`([\w./-]+\/[\w.-]+\.md)`/g)].map((match) => match[1] as string),
      ];

      expect(referenced.length, `${entry} should point the reader somewhere`).toBeGreaterThan(0);
      for (const path of new Set(referenced)) {
        expect(files, `${entry} references missing ${path}`).toContain(path);
      }
    }
  });

  it('references only prompts that were generated', () => {
    const mentioned = [...read('README.md').matchAll(/`(prompts\/[\w-]+\.md)`/g)].map(
      (match) => match[1] as string,
    );

    expect(mentioned.length).toBeGreaterThan(0);
    for (const prompt of mentioned) expect(files).toContain(prompt);
  });

  it('ships setup and doctor scripts wired to package.json', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    expect(files).toContain('scripts/setup.mjs');
    expect(files).toContain('scripts/doctor.mjs');
    expect(pkg.scripts.setup).toBe('node scripts/setup.mjs');
    expect(pkg.scripts.doctor).toBe('node scripts/doctor.mjs');
  });

  it('bakes every required environment key into doctor, with a resolvable anchor', () => {
    const doctor = read('scripts/doctor.mjs');
    const setup = read('docs/setup.md');
    const env = read('.env.example');

    // Every key doctor treats as required must be documented and reachable.
    const entries = [
      ...doctor.matchAll(/\{ key: '([A-Z0-9_]+)', owner: '([^']*)', anchor: '([^']*)' \}/g),
    ];
    expect(entries.length).toBeGreaterThan(0);

    for (const [, key, owner, anchor] of entries) {
      expect(env, `${key} should be in .env.example`).toContain(`${key}=`);
      expect(setup, `docs/setup.md needs a "## ${owner}" heading for #${anchor}`).toContain(
        `## ${owner}`,
      );
    }
  });

  it("does not let one module silently take over another module's npm script", () => {
    // Regression: expo shipped a "doctor" script that replaced the base one,
    // so `npm run doctor` ran expo-doctor and the generated script became
    // unreachable — invisible in the merged package.json.
    expect(result.warnings.filter((warning) => warning.includes('script'))).toEqual([]);
  });

  it('permits a module to override a script of something it requires', () => {
    // Expo deliberately replaces React Native's start/ios/android. That is the
    // point of a wrapper, so it must not be reported.
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    expect(pkg.scripts.start).toBe('expo start');
    expect(result.warnings.some((warning) => warning.includes('"start"'))).toBe(false);
  });

  it('round-trips the selection for regeneration', () => {
    const config = JSON.parse(read('ai-project.config.json')) as {
      projectName: string;
      choices: unknown;
      generated: Record<string, string>;
    };

    expect(config.projectName).toBe(fixture.projectName);
    expect(config.choices).toEqual(fixture.choices);

    // Fingerprints let a later regeneration tell generated content from edits.
    expect(Object.keys(config.generated).length).toBeGreaterThan(0);
    expect(config.generated['README.md']).toMatch(/^[a-f0-9]{16}$/);
    expect(config.generated).not.toHaveProperty('ai-project.config.json');
  });

  it('fingerprints every file it wrote', () => {
    const config = JSON.parse(read('ai-project.config.json')) as {
      generated: Record<string, string>;
    };

    const tracked = files.filter((file) => file !== 'ai-project.config.json');
    expect(Object.keys(config.generated).sort()).toEqual(tracked);
  });

  it('is deterministic — the same selection twice is byte-identical', () => {
    expect(run().vfs.entries()).toEqual(result.vfs.entries());
  });

  it('is independent of the order the answers were given in', () => {
    const reordered: Selection = {
      projectName: fixture.projectName,
      choices: {
        'crash-reporting': ['sentry'],
        analytics: ['posthog'],
        payments: 'revenuecat',
        backend: 'supabase',
        target: 'mobile',
        mobile: 'expo',
      },
    };

    expect(run(reordered).vfs.snapshot().files).toEqual(files);
  });

  it("honours --skip by omitting that builder's output", () => {
    const skipped = generate({
      rootDir: ROOT,
      targetDir: '/virtual/out',
      selection: fixture,
      builders,
      registry,
      skip: ['cursor'],
    });

    const skippedFiles = skipped.vfs.snapshot().files;

    expect(skipped.runs.find((run) => run.id === 'cursor')?.ran).toBe(false);
    expect(skippedFiles).not.toContain('.cursor/rules/expo.mdc');
    // cursorBuilder owns every .cursor/rules/* file, stack-agnostic ones
    // included, so skipping it omits all of them — not just per-technology ones.
    expect(skippedFiles).not.toContain('.cursor/rules/typescript.mdc');
  });

  it('generates a project from the required category alone', () => {
    const minimal = generate({
      rootDir: ROOT,
      targetDir: '/virtual/out',
      selection: { projectName: 'Bare', choices: { target: 'mobile', mobile: 'react-native' } },
      builders,
      registry,
    });
    const minimalFiles = minimal.vfs.snapshot().files;

    expect(minimalFiles).toContain('README.md');
    expect(minimalFiles).toContain('.cursor/rules/react-native.mdc');
    expect(minimalFiles).not.toContain('.cursor/rules/supabase.mdc');
    expect(minimal.moduleNames).toEqual(['React Native']);
  });

  it('generates a baseline project when every question is answered "None"', () => {
    // No category is mandatory: skipping a layer is a normal answer, and the
    // documentation-only project it produces is a legitimate outcome.
    const bare = generate({
      rootDir: ROOT,
      targetDir: '/virtual/out',
      selection: { projectName: 'Bare', choices: {} },
      builders,
      registry,
    });
    const bareFiles = bare.vfs.snapshot().files;

    expect(bare.moduleNames).toEqual([]);
    expect(bareFiles).toContain('README.md');
    expect(bareFiles).toContain('docs/setup.md');
    expect(bareFiles).toContain('.cursor/rules/typescript.mdc');
    expect(bareFiles.some((file) => file.startsWith('.cursor/rules/supabase'))).toBe(false);
  });

  it('rejects an unknown module with a useful message', () => {
    expect(() =>
      generate({
        rootDir: ROOT,
        targetDir: '/virtual/out',
        selection: { projectName: 'X', choices: { platform: 'nope' } },
        builders,
        registry,
      }),
    ).toThrow(GeneratorError);
  });
});

/**
 * Regression: every generated document told the reader — and the assistant —
 * to run `npm test`, but the `test` script ships with the testing module. A
 * project generated without one documented a command that did not exist, and
 * its CI failed on the first push.
 */
describe('commands a generated project documents', () => {
  const withTests = run({
    projectName: 'Tested',
    choices: { target: 'web', web: 'nextjs', 'ci-cd': 'github-actions', testing: ['jest'] },
  });
  const withoutTests = run({
    projectName: 'Untested',
    choices: { target: 'web', web: 'nextjs', 'ci-cd': 'github-actions' },
  });

  const scriptsOf = (result: ReturnType<typeof run>): Record<string, string> =>
    (JSON.parse(result.vfs.read('package.json') as string) as { scripts: Record<string, string> })
      .scripts;

  /** Every `npm run x` / `npm test` a generated file asks the reader to run. */
  const invoked = (result: ReturnType<typeof run>): Map<string, string[]> => {
    const found = new Map<string, string[]>();
    for (const [file, content] of result.vfs.entries()) {
      for (const match of content.matchAll(/\bnpm (?:run ([a-z][a-z0-9:-]*)|(test)\b)/g)) {
        const script = (match[1] ?? match[2]) as string;
        found.set(script, [...(found.get(script) ?? []), file]);
      }
    }
    return found;
  };

  it('defines every script it tells you to run, with a test runner', () => {
    const scripts = scriptsOf(withTests);
    for (const [script, where] of invoked(withTests)) {
      expect(scripts[script], `${where.join(', ')} run "npm run ${script}"`).toBeDefined();
    }
    expect(scripts.test).toBeDefined();
  });

  it('defines every script it tells you to run, without a test runner', () => {
    const scripts = scriptsOf(withoutTests);
    for (const [script, where] of invoked(withoutTests)) {
      expect(scripts[script], `${where.join(', ')} run "npm run ${script}"`).toBeDefined();
    }
    expect(scripts.test).toBeUndefined();
  });

  it('mentions npm test only where a runner exists', () => {
    expect([...invoked(withTests).keys()]).toContain('test');
    expect([...invoked(withoutTests).keys()]).not.toContain('test');
  });

  it('drops the CI test step rather than failing the pipeline on it', () => {
    const workflow = (result: ReturnType<typeof run>): string =>
      result.vfs.read('.github/workflows/ci.yml') as string;

    expect(workflow(withTests)).toContain('run: npm test');
    expect(workflow(withoutTests)).not.toContain('npm test');
    // The job name is what a reviewer reads on a red check — keep it honest.
    expect(workflow(withTests)).toContain('name: Lint, typecheck and test');
    expect(workflow(withoutTests)).toContain('name: Lint and typecheck');
  });

  it("leaves the workflow's own ${{ }} expressions for the runner to resolve", () => {
    // Regression: the template engine consumed them, collapsing the
    // concurrency group to "$-$" so unrelated branches cancelled each other.
    expect(withTests.vfs.read('.github/workflows/ci.yml')).toContain(
      'group: ${{ github.workflow }}-${{ github.ref }}',
    );
  });

  it('renders every template in a CI stack — no placeholder survives', () => {
    for (const [file, content] of withTests.vfs.entries()) {
      // `${{ … }}` belongs to the CI runner; `{{ flex: 1 }}` in prose is JSX.
      const tags = content.replace(/\$\{\{[^{}]*\}\}/g, '').match(/\{\{[^{}:]*\}\}/g) ?? [];
      expect(tags, `${file} has unrendered tags`).toEqual([]);
    }
  });
});
