import type { BuildContext, CategoryQuestion, LoadedModule, Selection } from '../types.js';
import type { TemplateData } from '../template/render.js';
import { render } from '../template/render.js';
import { mergeFolders, renderFolderTree } from '../merge/mergeFolders.js';

/** Turns a project name into a safe npm package / directory name. */
export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 214) || 'ai-project'
  );
}

export function createBuildContext(input: {
  projectName: string;
  targetDir: string;
  selection: Selection;
  modules: LoadedModule[];
  categories: CategoryQuestion[];
  base?: LoadedModule;
  generatorVersion: string;
}): BuildContext {
  // Base always leads, so its content frames every merged document.
  const modules = input.base ? [input.base, ...input.modules] : [...input.modules];

  const ctx: BuildContext = {
    projectName: input.projectName,
    targetDir: input.targetDir,
    selection: input.selection,
    modules,
    categories: input.categories,
    warnings: [],
    generatorVersion: input.generatorVersion,
  };

  // `dependencies.json` may branch on the rest of the stack, so it is rendered
  // now that the full module list is known. Safe to compute template data
  // first: none of it reads the dependencies field.
  const data = templateData(ctx);
  ctx.modules = modules.map((module) => ({
    ...module,
    dependencies:
      renderJson(module.dependenciesRaw, 'dependencies.json', module, data, ctx) ??
      module.dependencies,
    packageFragment:
      renderJson(module.packageFragmentRaw, 'package.fragment.json', module, data, ctx) ??
      module.packageFragment,
  }));
  return ctx;
}

/** Renders a templated JSON asset, or returns undefined when it needs no rendering. */
function renderJson<T>(
  raw: string | undefined,
  filename: string,
  module: LoadedModule,
  data: TemplateData,
  ctx: BuildContext,
): T | undefined {
  if (!raw || !raw.includes('{{')) return undefined;

  try {
    return JSON.parse(render(raw, data)) as T;
  } catch (error) {
    ctx.warnings.push(
      `${module.manifest.name}: ${filename} did not parse after rendering — ${(error as Error).message}`,
    );
    return undefined;
  }
}

/**
 * The data every template is rendered against.
 *
 * Deliberately free of timestamps and absolute paths: generating the same
 * selection twice must produce byte-identical output.
 */
export function templateData(ctx: BuildContext): TemplateData {
  const technologies = ctx.modules.filter((module) => !module.isBase);

  const stack = ctx.categories
    .map((category) => ({
      id: category.id,
      label: category.label,
      modules: technologies
        .filter((module) => module.manifest.category === category.id)
        .map(describe),
    }))
    .filter((entry) => entry.modules.length > 0);

  const folders = mergeFolders(ctx.modules.flatMap((module) => module.folders));

  return {
    projectName: ctx.projectName,
    projectSlug: slugify(ctx.projectName),
    modules: technologies.map(describe),
    moduleIds: technologies.map((module) => module.manifest.id),
    moduleCount: technologies.length,
    stack,
    folders,
    folderTree: renderFolderTree(folders),
    envKeys: ctx.modules.flatMap((module) => module.env.map((variable) => variable.key)).sort(),
    // Full env detail, so a generated script can check what is still unset and
    // name the section of docs/setup.md that explains each one.
    envVars: describeEnv(ctx),
    requiredEnvVars: describeEnv(ctx).filter((variable) => variable.required),
    // Lets a module's own content adapt to the rest of the stack:
    // {{#if has.react-native}} … {{/if}}. Keeps cross-platform modules from
    // needing a hard `requires` just to know what they are running alongside.
    // Category ids are flagged too ({{#if has.testing}}), so base content can
    // ask "did anything fill this slot?" without naming every candidate.
    has: {
      ...Object.fromEntries(ctx.categories.map((category) => [category.id, false])),
      ...Object.fromEntries(
        technologies.map((module) => [module.manifest.category, true] as const),
      ),
      ...Object.fromEntries(ctx.modules.map((module) => [module.manifest.id, true])),
    },
  };
}

interface EnvDescription extends TemplateData {
  key: string;
  required: boolean;
  moduleName: string;
  anchor: string;
}

/** Every declared variable, de-duplicated, first declaring module wins. */
function describeEnv(ctx: BuildContext): EnvDescription[] {
  const seen = new Set<string>();
  const described: EnvDescription[] = [];

  for (const module of ctx.modules) {
    for (const variable of module.env) {
      if (seen.has(variable.key)) continue;
      seen.add(variable.key);
      described.push({
        key: variable.key,
        required: variable.required,
        moduleName: module.manifest.name,
        anchor: headingAnchor(module.manifest.name),
      });
    }
  }

  return described;
}

/** GitHub-style heading anchor, matching the headings docsBuilder emits. */
function headingAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function describe(module: LoadedModule): TemplateData {
  return {
    id: module.manifest.id,
    name: module.manifest.name,
    category: module.manifest.category,
    description: module.manifest.description,
  };
}
