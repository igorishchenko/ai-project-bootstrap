import type { Builder, BuildContext, LoadedModule } from '../core/types.js';
import { render } from '../core/template/render.js';
import { templateData } from '../core/pipeline/buildContext.js';
import { mergeFolders, renderFolderTree } from '../core/merge/mergeFolders.js';
import { anchor } from './docsBuilder.js';

/**
 * Assembles `docs/architecture.md`.
 *
 * The stack overview and its Mermaid diagram are derived entirely from
 * manifests — categories and names are data, so a technology added tomorrow
 * appears in the diagram without touching this file. Flow-level prose (auth
 * flow, payment flow) comes from each module's own `architecture.md`.
 */
export const architectureBuilder: Builder = {
  id: 'architecture',
  label: 'Generated architecture',
  order: 50,
  build(ctx, vfs) {
    const data = templateData(ctx);
    const technologies = ctx.modules.filter((module) => !module.isBase);
    const folders = mergeFolders(ctx.modules.flatMap((module) => module.folders));

    const byCategory = ctx.categories
      .map((category) => ({
        id: category.id,
        label: category.label,
        modules: technologies.filter((module) => module.manifest.category === category.id),
      }))
      .filter((entry) => entry.modules.length > 0);

    const parts: string[] = [
      `# ${ctx.projectName} — Architecture`,
      '',
      'How this project is put together, and how data moves through it.',
      '',
      '## Chosen stack',
      '',
      '| Layer | Technology | Role |',
      '| --- | --- | --- |',
    ];

    for (const entry of byCategory) {
      for (const module of entry.modules) {
        parts.push(`| ${entry.label} | ${module.manifest.name} | ${module.manifest.description} |`);
      }
    }
    parts.push('');

    if (byCategory.length > 0) {
      parts.push('```mermaid', ...stackDiagram(ctx.projectName, byCategory), '```', '');
    }

    if (folders.length > 0) {
      parts.push(
        '## Folder organization',
        '',
        '```',
        `${projectRootLabel(ctx)}/`,
        indent(renderFolderTree(folders)),
        '```',
        '',
      );
    }

    const flows = ctx.modules.filter((module) => module.architecture);
    if (flows.length > 0) {
      parts.push('## Flows', '');
      for (const module of flows) {
        parts.push(`- [${module.manifest.name}](#${anchor(module.manifest.name)})`);
      }
      parts.push('');

      for (const module of flows) {
        parts.push(
          `### ${module.manifest.name}`,
          '',
          render(module.architecture as string, data).trim(),
          '',
        );
      }
    }

    vfs.write('docs/architecture.md', `${parts.join('\n').trimEnd()}\n`);
  },
};

interface CategoryEntry {
  id: string;
  label: string;
  modules: LoadedModule[];
}

/** Where a request enters the system, in the absence of a more specific edge below. */
const FRONTEND_CATEGORIES = ['web', 'mobile'];
const BACKEND_CATEGORY = 'backend';
const DATABASE_CATEGORY = 'database';

/**
 * A top-down diagram: the app, its layers, and the modules in each — plus two
 * kinds of edges beyond the tree. `requires` edges name an actual dependency
 * the resolver already computed (e.g. an auth module requiring its backend).
 * Backbone edges are a generic frontend → backend → database default, drawn
 * only between layers that don't already have a more specific `requires` edge
 * connecting them, since category ids (not technology ids) are the only thing
 * this function is allowed to know about.
 */
function stackDiagram(projectName: string, byCategory: CategoryEntry[]): string[] {
  const lines = ['flowchart TD', `  app["${escapeLabel(projectName)}"]`];
  const layerNodeByCategory = new Map<string, string>();

  byCategory.forEach((entry, index) => {
    const categoryNode = `layer${index}`;
    layerNodeByCategory.set(entry.id, categoryNode);
    lines.push(`  app --> ${categoryNode}["${escapeLabel(entry.label)}"]`);
    for (const module of entry.modules) {
      lines.push(
        `  ${categoryNode} --> ${nodeId(module.manifest.id)}["${escapeLabel(module.manifest.name)}"]`,
      );
    }
  });

  lines.push(...backboneEdges(layerNodeByCategory));
  lines.push(...requiresEdges(byCategory));

  return lines;
}

/** Frontend → backend → database, using whichever of those three layers are actually present. */
function backboneEdges(layerNodeByCategory: Map<string, string>): string[] {
  const frontendNodes = FRONTEND_CATEGORIES.map((id) => layerNodeByCategory.get(id)).filter(
    (node): node is string => node !== undefined,
  );
  const backendNode = layerNodeByCategory.get(BACKEND_CATEGORY);
  const databaseNode = layerNodeByCategory.get(DATABASE_CATEGORY);
  const downstreamOfFrontend = backendNode ?? databaseNode;

  const lines: string[] = [];
  if (downstreamOfFrontend) {
    for (const node of frontendNodes) lines.push(`  ${node} -->|calls| ${downstreamOfFrontend}`);
  }
  if (backendNode && databaseNode) lines.push(`  ${backendNode} -->|reads/writes| ${databaseNode}`);
  return lines;
}

/** A dashed edge for every hard prerequisite the resolver pulled in — already computed, not guessed. */
function requiresEdges(byCategory: CategoryEntry[]): string[] {
  const modules = byCategory.flatMap((entry) => entry.modules);
  const selectedIds = new Set(modules.map((module) => module.manifest.id));

  const lines: string[] = [];
  for (const module of modules) {
    for (const requiredId of module.manifest.requires) {
      if (selectedIds.has(requiredId)) {
        lines.push(`  ${nodeId(module.manifest.id)} -.->|requires| ${nodeId(requiredId)}`);
      }
    }
  }
  return lines;
}

/** Mermaid node ids must be identifier-safe. */
function nodeId(id: string): string {
  return `mod_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'");
}

function projectRootLabel(ctx: BuildContext): string {
  return ctx.projectName.trim() || 'project';
}

function indent(block: string): string {
  return block
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n');
}
