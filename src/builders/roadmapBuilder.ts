import type { Builder, CategoryQuestion, LoadedModule } from '../core/types.js';
import { isGatingQuestion } from '../core/types.js';
import { loadFeatureIndex, type FeatureManifest } from '../core/registry/loadFeatures.js';

/**
 * Categories that shape the wizard or pick the platform itself, not a
 * feature to build — the project already has a working Expo/Next.js/etc.
 * skeleton on day one, so scheduling a week to "build" it reads as noise.
 * `isGatingQuestion` catches `aiTools`/`target` on its own; `mobile`/`web`
 * are real (non-gating) categories with real modules behind them, so they
 * need naming explicitly.
 */
const PLATFORM_CATEGORIES = new Set(['mobile', 'web']);

/** How many category items land in one week before the roadmap opens a new one. */
const ITEMS_PER_WEEK = 3;

interface WeekItem {
  category: CategoryQuestion;
  modules: LoadedModule[];
}

/**
 * Assembles `docs/roadmap.md` — a suggested build order, derived from the
 * resolved selection at generation time.
 *
 * The heuristic is deliberately simple: `config/categories.json`'s own
 * `order` field already encodes a reasonable dependency-aware sequence
 * (backend and auth before payments, payments before things that gate on a
 * paying user, deployment last), so this reuses it rather than inventing a
 * second priority system. The value here is a sensible default a team can
 * reorder, not an optimized schedule.
 */
export const roadmapBuilder: Builder = {
  id: 'roadmap',
  label: 'Generated roadmap',
  order: 55,
  build(ctx, vfs) {
    const technologies = ctx.modules.filter((module) => !module.isBase);
    const features = loadFeatureIndex(ctx.rootDir);

    const items: WeekItem[] = ctx.categories
      .filter((category) => !isGatingQuestion(category) && !PLATFORM_CATEGORIES.has(category.id))
      .map((category) => ({
        category,
        modules: technologies.filter((module) => module.manifest.category === category.id),
      }))
      .filter((entry) => entry.modules.length > 0)
      .sort((a, b) => a.category.order - b.category.order);

    const weeks: WeekItem[][] = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_WEEK) {
      weeks.push(items.slice(i, i + ITEMS_PER_WEEK));
    }

    const parts: string[] = [
      `# ${ctx.projectName} — Roadmap`,
      '',
      'A suggested build order for the stack you selected, derived from what ' +
        'each piece typically depends on — not a schedule handed down from ' +
        'above. Reorder, merge or split these weeks to fit your team; the only ' +
        'thing this is trying to get right is *what to build before what*.',
      '',
    ];

    if (weeks.length === 0) {
      parts.push(
        'Nothing beyond the base project is selected yet, so there is nothing to ' +
          'sequence. Run `ai-project-bootstrap add <technology-id>` to bring in ' +
          'the first piece — this doc updates the next time you run `upgrade`.',
        '',
      );
    } else {
      weeks.forEach((week, index) => {
        parts.push(`## Week ${index + 1}`, '');
        for (const item of week) parts.push(roadmapLine(item, features));
        parts.push('');
      });
    }

    vfs.write('docs/roadmap.md', `${parts.join('\n').trimEnd()}\n`);
  },
};

function roadmapLine(item: WeekItem, features: FeatureManifest[]): string {
  const moduleNames = item.modules.map((module) => module.manifest.name).join(', ');
  const hint = implementHint(item.category.id, item.modules, features);
  return `- **${item.category.label}** — ${moduleNames}${hint ? ` (${hint})` : ''}`;
}

/** The `implement` command to run, when a feature exists for this category and covers a selected module. */
function implementHint(
  categoryId: string,
  modules: LoadedModule[],
  features: FeatureManifest[],
): string | undefined {
  const feature = features.find((entry) => entry.category === categoryId);
  if (!feature) return undefined;

  const covered = modules.some((module) => feature.providers.includes(module.manifest.id));
  if (!covered) return undefined;

  return `run \`ai-project-bootstrap implement ${feature.id}\``;
}
