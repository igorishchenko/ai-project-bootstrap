import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { outputPath } from '../builders/reserved.js';
import { createBuildContext, templateData } from '../core/pipeline/buildContext.js';
import {
  loadFeatures,
  type FeatureProviderContent,
  type LoadedFeature,
} from '../core/registry/loadFeatures.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { resolveSelection } from '../core/resolve/resolveSelection.js';
import { gatingCategoryIds } from '../core/resolve/validate.js';
import { render } from '../core/template/render.js';
import { fingerprint } from '../core/vfs/fingerprint.js';
import {
  type Fingerprints,
  preservedPaths,
  unrecordedExistingPaths,
} from '../core/vfs/preserve.js';
import { VirtualFs } from '../core/vfs/virtualFs.js';
import { loadSelectionFile } from './configFile.js';
import type { Reporter } from './reporter.js';

export interface ImplementFlags {
  featureId?: string;
  dir?: string;
  dryRun: boolean;
  listFeatures: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--dry-run', '--list-features', '-h', '--help']);
const VALUED = new Set(['--dir']);

/** Parses `implement`'s own small flag set — deliberately separate from the main parser. */
export function parseImplementFlags(argv: string[]): ImplementFlags {
  const flags: ImplementFlags = { dryRun: false, listFeatures: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--dry-run') flags.dryRun = true;
      if (arg === '--list-features') flags.listFeatures = true;
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

    if (arg.startsWith('-')) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `Unknown flag ${arg}.`,
        'Run `ai-project-bootstrap implement --help` to see every flag.',
      );
    }

    // First bare argument is the feature id — matches `add`'s technology id.
    flags.featureId ??= arg;
  }

  return flags;
}

export const IMPLEMENT_HELP_TEXT = `
ai-project-bootstrap implement — scaffold a specific feature into an already-generated project.

Usage
  npx ai-project-bootstrap implement <feature-id> [options]
  npx ai-project-bootstrap implement --list-features

Reads the project's ai-project.config.json to see which technology answers
the feature's category (e.g. authentication reads "auth"), and writes a
stack-tailored implementation plan, AI prompts, a validation checklist, and a
handful of skeleton files — not a full implementation; you (or your AI
assistant, using the generated prompts) write the actual logic.

Options
      --dir <path>       Project to write into (default: the current directory)
      --dry-run          Print what would change without touching disk
      --list-features    List every available feature and exit
  -h, --help              Show this help

Output
  implementation/<feature>/plan.md          the step-by-step plan
  implementation/<feature>/checklist.md     what to verify before shipping
  implementation/<feature>/prompts/*.md     ready to hand to your AI assistant
  (scaffold files land in the project's normal source layout — src/features/, etc.)

Never overwrites work it did not write. A file you have hand-edited since it
was scaffolded is left alone — the same fingerprint-based protection \`add\` and
\`upgrade\` use — and so is a file that was already there and we have no record
of writing at all, which is what an archetype's own screens and hooks are.
Both are named in the summary.
`.trim();

const MANIFEST_FILENAME = '.manifest.json';

function manifestFile(targetDir: string, featureId: string): string {
  return path.join(targetDir, 'implementation', featureId, MANIFEST_FILENAME);
}

function readFeatureFingerprints(targetDir: string, featureId: string): Fingerprints | undefined {
  const file = manifestFile(targetDir, featureId);
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { generated?: Fingerprints };
    return parsed.generated;
  } catch {
    return undefined;
  }
}

function writeFeatureFingerprints(
  targetDir: string,
  featureId: string,
  generated: Fingerprints,
): void {
  const file = manifestFile(targetDir, featureId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ generated }, null, 2)}\n`, 'utf8');
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

function listFeaturesText(features: LoadedFeature[]): string {
  if (features.length === 0) return 'No features are installed.';
  const width = Math.max(...features.map((feature) => feature.manifest.id.length));
  return features
    .map((feature) => `${feature.manifest.id.padEnd(width)}  ${feature.manifest.description}`)
    .join('\n');
}

/**
 * Works out which provider a project's own selection implies for `feature`,
 * and the content for it — or throws a clear, actionable error. Pure (no
 * disk access), so the two failure modes (nothing selected for the category;
 * something selected that this feature has no content for yet) are directly
 * testable without a real generated project on disk.
 */
export function resolveFeatureContent(
  feature: LoadedFeature,
  choices: Record<string, string | string[]>,
): { providerId: string; content: FeatureProviderContent } {
  const answer = choices[feature.manifest.category];
  const providerId = Array.isArray(answer) ? answer[0] : answer;

  if (!providerId || providerId === 'none') {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `This project has no "${feature.manifest.category}" technology selected — "${feature.manifest.id}" needs one.`,
      `Run "add <id> --replace" first. Supported for this feature: ${feature.manifest.providers.join(', ')}.`,
    );
  }

  const content = feature.providers.get(providerId);
  if (!content) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `No "${feature.manifest.id}" content yet for "${providerId}".`,
      `Supported providers for this feature: ${feature.manifest.providers.join(', ')}.`,
    );
  }

  return { providerId, content };
}

export async function runImplement(
  argv: string[],
  rootDir: string,
  reporter: Reporter,
): Promise<number> {
  const flags = parseImplementFlags(argv);

  if (flags.help) {
    reporter.plain(IMPLEMENT_HELP_TEXT);
    return 0;
  }

  const registry = loadRegistry(rootDir);
  const features = loadFeatures(rootDir, registry.byId, registry.categories);

  if (flags.listFeatures) {
    reporter.plain(listFeaturesText(features));
    return 0;
  }

  if (!flags.featureId) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'implement needs a feature id.',
      features.length > 0
        ? `Example: ai-project-bootstrap implement ${features[0]?.manifest.id} — run --list-features to see every available one.`
        : 'No features are installed.',
    );
  }

  const feature = features.find((entry) => entry.manifest.id === flags.featureId);
  if (!feature) {
    throw new GeneratorError(
      'UNKNOWN_MODULE',
      `Unknown feature "${flags.featureId}".`,
      features.length > 0
        ? `Available features: ${features.map((entry) => entry.manifest.id).join(', ')}.`
        : 'No features are installed.',
    );
  }

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
  const { providerId, content } = resolveFeatureContent(feature, selection.choices);

  const providerModule = registry.byId.get(providerId);
  const providerName = providerModule?.manifest.name ?? providerId;

  reporter.intro(readGeneratorPackageInfo(rootDir).version);
  reporter.plain(
    `Implementing ${feature.manifest.name} (${providerName}) in ${selection.projectName}…\n`,
  );

  // Rendered against the project's *resolved* stack, not just its name.
  //
  // A provider's content is per-technology, but a technology is not a
  // platform: Supabase Auth and Clerk both answer "auth" on a web app and on a
  // native one, and a screen written with react-native primitives does not
  // compile in either Next.js project this tool can generate. Reusing
  // `templateData` rather than assembling a smaller object here is deliberate —
  // a scaffold branching on `{{#if has.react-native}}` then means exactly what
  // the same line means inside `technologies/<id>/templates/`, instead of a
  // second, subtly different vocabulary for feature authors to learn.
  const { modules } = resolveSelection(
    selection,
    registry.byId,
    gatingCategoryIds(registry.categories),
  );
  const data = templateData(
    createBuildContext({
      rootDir,
      projectName: selection.projectName,
      targetDir,
      selection,
      modules,
      categories: registry.categories,
      base: registry.base,
      generatorVersion: readGeneratorPackageInfo(rootDir).version,
    }),
  );
  const base = `implementation/${feature.manifest.id}`;

  const vfs = new VirtualFs();
  vfs.setOwner('implement');

  const planPath = content.plan ? `${base}/plan.md` : undefined;
  if (content.plan && planPath)
    vfs.write(planPath, ensureTrailingNewline(render(content.plan, data)));

  const checklistPath = content.checklist ? `${base}/checklist.md` : undefined;
  if (content.checklist && checklistPath) {
    vfs.write(checklistPath, ensureTrailingNewline(render(content.checklist, data)));
  }

  const promptPaths: string[] = [];
  for (const asset of content.prompts) {
    const target = `${base}/prompts/${asset.relativePath}`;
    vfs.write(target, ensureTrailingNewline(render(asset.content, data)));
    promptPaths.push(target);
  }

  const scaffoldPaths: string[] = [];
  for (const asset of content.scaffold) {
    const target = outputPath(asset.relativePath);
    vfs.write(target, ensureTrailingNewline(render(asset.content, data)));
    scaffoldPaths.push(target);
  }

  const allFiles = vfs.snapshot().files;
  const recorded = readFeatureFingerprints(targetDir, feature.manifest.id);

  // Two reasons to leave a file alone, kept apart because they need different
  // sentences. One is "you edited what we wrote"; the other is "this was
  // already here and we have never written it" — which is the whole first run,
  // and is how `implement authentication` used to overwrite the working
  // `useAuth.ts` an archetype had just scaffolded, leaving a project that no
  // longer compiled against its own App.tsx.
  const edited = preservedPaths(targetDir, allFiles, recorded);
  const alreadyPresent = unrecordedExistingPaths(targetDir, allFiles, recorded);

  // A scaffold is all-or-nothing, following `add --replace`: its files call
  // each other, so applying the half that happens not to collide is worse than
  // applying none of it. Preserving the archetype's `useAuth.ts` per-file while
  // still writing `SignUpScreen.tsx` left a screen calling a `signUp` the
  // preserved hook does not export — a project that compiled before `implement`
  // and did not after, which is the failure this guard exists to prevent.
  //
  // The plan, checklist and prompts are ours alone and still land: they are
  // what someone reconciling by hand actually needs.
  const scaffoldSet = new Set(scaffoldPaths);
  const blockedBy = alreadyPresent.filter((file) => scaffoldSet.has(file));
  const skippedScaffold = blockedBy.length > 0 ? scaffoldPaths : [];

  const preserve = new Set([...edited, ...alreadyPresent, ...skippedScaffold]);

  vfs.flush(targetDir, { dryRun: flags.dryRun, force: true, preserve });

  if (!flags.dryRun) {
    // Keep every fingerprint already on record, and add one only for what was
    // actually written. Re-recording a skipped file would let the next run
    // write it as an ordinary refresh, re-creating the half-applied scaffold
    // this run just refused to produce.
    const generated: Fingerprints = { ...recorded };
    for (const file of allFiles) {
      if (preserve.has(file)) continue;
      const fresh = vfs.read(file);
      if (fresh !== undefined) generated[file] = fingerprint(fresh);
    }
    writeFeatureFingerprints(targetDir, feature.manifest.id, generated);
  }

  reporter.implementSummary({
    targetDir,
    featureName: feature.manifest.name,
    providerName,
    planPath,
    checklistPath,
    promptPaths,
    scaffoldPaths: skippedScaffold.length > 0 ? [] : scaffoldPaths,
    preserved: edited,
    alreadyPresent,
    skippedScaffold,
    dryRun: flags.dryRun,
  });

  return 0;
}
