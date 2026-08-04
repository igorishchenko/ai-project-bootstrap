import type { BuildContext, CategoryQuestion, LoadedModule, Selection } from '../types.js';
import type { TemplateData } from '../template/render.js';
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
}): BuildContext {
  // Base always leads, so its content frames every merged document.
  const modules = input.base ? [input.base, ...input.modules] : [...input.modules];

  return {
    projectName: input.projectName,
    targetDir: input.targetDir,
    selection: input.selection,
    modules,
    categories: input.categories,
    warnings: [],
  };
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
