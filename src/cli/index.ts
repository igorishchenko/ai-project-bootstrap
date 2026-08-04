import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builderIds, builders } from '../builders/index.js';
import { generate } from '../core/pipeline/generate.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { slugify } from '../core/pipeline/buildContext.js';
import type { Selection } from '../core/types.js';
import { HELP_TEXT, parseFlags, type CliFlags } from './flags.js';
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
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function loadSelectionFile(file: string): Selection {
  if (!fs.existsSync(file)) {
    throw new GeneratorError('INVALID_CONFIG', `No such config file: ${file}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${file} is not valid JSON: ${(error as Error).message}`,
    );
  }

  const selection = parsed as Partial<Selection>;
  if (typeof selection?.projectName !== 'string' || typeof selection?.choices !== 'object') {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${file} is not a valid selection.`,
      'It needs a "projectName" string and a "choices" object — see ai-project.config.json in a generated project.',
    );
  }
  return { projectName: selection.projectName, choices: selection.choices ?? {} };
}

async function main(argv: string[]): Promise<number> {
  const flags: CliFlags = parseFlags(argv);
  const rootDir = findGeneratorRoot();
  const version = readVersion(rootDir);
  const reporter = new Reporter();

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

  reporter.intro(version);

  const selection = flags.config
    ? loadSelectionFile(flags.config)
    : await runWizard({
        categories: registry.categories,
        modules: registry.modules,
        name: flags.name,
        acceptDefaults: flags.yes,
      });

  if (flags.name) selection.projectName = flags.name;

  const targetDir = path.resolve(flags.out ?? slugify(selection.projectName));

  const result = generate({
    rootDir,
    targetDir,
    selection,
    builders,
    registry,
    skip: flags.skip,
    onBuilder: (run) => reporter.step(run),
  });

  const flushed = result.vfs.flush(targetDir, { dryRun: flags.dryRun, force: flags.force });

  reporter.summary({
    targetDir,
    fileCount: flushed.files.length,
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
