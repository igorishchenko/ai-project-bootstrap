import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builderIds, builders } from '../builders/index.js';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { preservedPaths, readFingerprints, removablePaths } from '../core/vfs/preserve.js';
import { generate } from '../core/pipeline/generate.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { ADD_HELP_TEXT, mergeChoice, parseAddFlags, replaceChoice } from './add.js';
import { loadSelectionFile } from './configFile.js';
import { runDoctor } from './doctor.js';
import { runImplement } from './implement.js';
import { runReview } from './review.js';
import { runUpgrade } from './upgrade.js';
import { HELP_TEXT, parseFlags, type CliFlags } from './flags.js';
import { resolveProjectTarget } from './projectTarget.js';
import { Reporter } from './reporter.js';
import { runWizard, WizardCancelled } from './wizard.js';

/**
 * Walks up from this file to the generator's own package root, so
 * `technologies/`, `assets/` and `config/` resolve whether we are running from
 * `dist/`, from source, or from inside node_modules.
 */
function findGeneratorRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));

  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(dir, 'config', 'categories.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new GeneratorError(
    'INVALID_CONFIG',
    'Could not locate the generator root (config/categories.json).',
    'Reinstall the package — its config/ and technologies/ directories must ship alongside dist/.',
  );
}

function readVersion(rootDir: string): string {
  return readGeneratorPackageInfo(rootDir).version;
}

/**
 * Adds one technology to a project that was already generated.
 *
 * Loads its saved ai-project.config.json, merges in the new choice, and runs
 * the exact same generate-then-flush path as a normal `--config` regeneration
 * — including fingerprint preservation, so files edited since generation are
 * left alone.
 */
async function runAdd(argv: string[], rootDir: string, reporter: Reporter): Promise<number> {
  const flags = parseAddFlags(argv);

  if (flags.help) {
    reporter.plain(ADD_HELP_TEXT);
    return 0;
  }
  if (!flags.moduleId) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'add needs a technology id.',
      'Example: ai-project-bootstrap add stripe — run --list-modules on the main command to see every id.',
    );
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

  const module = registry.byId.get(flags.moduleId);
  if (!module) {
    throw new GeneratorError(
      'UNKNOWN_MODULE',
      `Unknown technology "${flags.moduleId}".`,
      'Run `ai-project-bootstrap --list-modules` to see every available id.',
    );
  }

  const category = registry.categories.find((entry) => entry.id === module.manifest.category);
  if (!category) {
    throw new GeneratorError(
      'INVALID_MANIFEST',
      `"${module.manifest.id}" declares category "${module.manifest.category}", which has no wizard question.`,
    );
  }

  let oldId: string | undefined;
  if (flags.replace) {
    oldId = replaceChoice(selection, module, category);
  } else {
    mergeChoice(selection, module, category);
  }
  const oldModule = oldId ? registry.byId.get(oldId) : undefined;

  reporter.intro(readVersion(rootDir));
  reporter.plain(
    oldId
      ? `Replacing ${oldModule?.manifest.name ?? oldId} with ${module.manifest.name} in ${selection.projectName}…\n`
      : `Adding ${module.manifest.name} to ${selection.projectName}…\n`,
  );

  const recorded = readFingerprints(configFile);

  const result = generate({
    rootDir,
    targetDir,
    selection,
    builders,
    registry,
    onBuilder: (run) => reporter.step(run),
  });

  const newFiles = result.vfs.snapshot().files;

  // Same safety net as a normal regeneration: anything whose contents no
  // longer match what was recorded at generation is the user's, not ours.
  const preserve = new Set(preservedPaths(targetDir, newFiles, recorded));

  // A plain `add` never removes anything — only --replace can make a
  // previously-generated file stop being produced at all.
  let removed: string[] = [];
  if (oldId) {
    const { safe, handEdited } = removablePaths(targetDir, recorded, newFiles);
    if (handEdited.length > 0) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `Cannot replace ${oldModule?.manifest.name ?? oldId} — ${handEdited.length} of its file${handEdited.length > 1 ? 's have' : ' has'} been hand-edited since generation.`,
        `Move or remove ${handEdited.join(', ')} yourself, then run "add ${module.manifest.id} --replace" again. Nothing was changed.`,
      );
    }
    removed = safe;
    if (!flags.dryRun) {
      for (const relative of removed) {
        fs.rmSync(path.join(targetDir, ...relative.split('/')), { force: true });
      }
    }
  }

  const flushed = result.vfs.flush(targetDir, {
    dryRun: flags.dryRun,
    // The target is necessarily an existing, non-empty project — that is the
    // whole point of `add` — so the "don't write into a non-empty directory"
    // guard would always trip otherwise.
    force: true,
    preserve,
  });

  reporter.summary({
    targetDir,
    fileCount: flushed.files.length,
    preserved: flushed.preserved,
    removed,
    modules: result.moduleNames,
    autoIncluded: result.autoIncluded,
    warnings: result.warnings,
    dryRun: flags.dryRun,
  });

  return 0;
}

async function main(argv: string[]): Promise<number> {
  const rootDir = findGeneratorRoot();
  const reporter = new Reporter();

  if (argv[0] === 'add') {
    return runAdd(argv.slice(1), rootDir, reporter);
  }
  if (argv[0] === 'doctor') {
    return runDoctor(argv.slice(1), rootDir, reporter);
  }
  if (argv[0] === 'upgrade') {
    return runUpgrade(argv.slice(1), rootDir, reporter);
  }
  if (argv[0] === 'implement') {
    return runImplement(argv.slice(1), rootDir, reporter);
  }
  if (argv[0] === 'review') {
    return runReview(argv.slice(1), rootDir, reporter);
  }

  const flags: CliFlags = parseFlags(argv);
  const version = readVersion(rootDir);

  if (flags.help) {
    reporter.plain(HELP_TEXT);
    return 0;
  }
  if (flags.version) {
    reporter.plain(version);
    return 0;
  }

  const registry = loadRegistry(rootDir);

  if (flags.listModules) {
    reporter.list(
      registry.modules.map((module) => ({
        id: module.manifest.id,
        category: module.manifest.category,
        name: module.manifest.name,
      })),
    );
    return 0;
  }

  const unknownSkips = flags.skip.filter((id) => !builderIds().includes(id));
  if (unknownSkips.length > 0) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown builder id(s) to skip: ${unknownSkips.join(', ')}.`,
      `Available builders: ${builderIds().join(', ')}.`,
    );
  }

  if (flags.preset && flags.config) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      '--preset and --config cannot be used together.',
      'Both pre-fill the selection — pick one: --preset for a curated starting point, --config to replay a saved one.',
    );
  }
  if (flags.preset && !registry.presets.some((preset) => preset.id === flags.preset)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown preset "${flags.preset}".`,
      registry.presets.length > 0
        ? `Available presets: ${registry.presets.map((preset) => preset.id).join(', ')}.`
        : 'No presets are installed.',
    );
  }

  reporter.intro(version);

  const selection = flags.config
    ? loadSelectionFile(flags.config)
    : await runWizard({
        categories: registry.categories,
        modules: registry.modules,
        presets: registry.presets,
        presetId: flags.preset,
        name: flags.name,
        // A directory was already given, so the name question starts from it
        // rather than from a generic placeholder.
        defaultName: flags.out ? path.basename(path.resolve(flags.out)) : undefined,
        acceptDefaults: flags.yes,
      });

  if (flags.name) selection.projectName = flags.name;

  // The answer may be a path — `./apps/my-proj` names the project `my-proj` and
  // generates it there, creating any missing parent directories.
  const target = resolveProjectTarget({ name: selection.projectName, out: flags.out });
  selection.projectName = target.projectName;
  const targetDir = target.targetDir;

  const result = generate({
    rootDir,
    targetDir,
    selection,
    builders,
    registry,
    skip: flags.skip,
    onBuilder: (run) => reporter.step(run),
  });

  // Regenerating over an existing project must not discard the user's edits.
  // Anything whose contents no longer match the fingerprint recorded when it
  // was generated is theirs, not ours.
  const preserve = new Set(
    preservedPaths(
      targetDir,
      result.vfs.snapshot().files,
      readFingerprints(path.join(targetDir, CONFIG_FILENAME)),
    ),
  );

  const flushed = result.vfs.flush(targetDir, {
    dryRun: flags.dryRun,
    force: flags.force,
    preserve,
  });

  reporter.summary({
    targetDir,
    fileCount: flushed.files.length,
    preserved: flushed.preserved,
    modules: result.moduleNames,
    autoIncluded: result.autoIncluded,
    warnings: result.warnings,
    dryRun: flags.dryRun,
  });

  return 0;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    if (error instanceof WizardCancelled) {
      process.stdout.write('\nCancelled.\n\n');
      process.exitCode = 130;
      return;
    }
    new Reporter().failure(error);
    process.exitCode = 1;
  });
