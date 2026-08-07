import type { Builder } from '../core/types.js';
import { summarizeCosts, type CostLineItem } from '../core/pricing.js';

/**
 * Assembles `docs/costs.md` — a monthly cost estimate for the resolved
 * selection, derived entirely from each module's own `manifest.json`
 * `pricing` field (see `CONTRIBUTING.md`). No network calls, no live
 * pricing API — this is exactly as fresh as the last time a maintainer
 * checked a vendor's pricing page, which is why every line says so.
 */
export const costsBuilder: Builder = {
  id: 'costs',
  label: 'Generated cost estimate',
  order: 56,
  build(ctx, vfs) {
    const summary = summarizeCosts(ctx.modules);

    const parts: string[] = [
      `# ${ctx.projectName} — Estimated Costs`,
      '',
      "A starting estimate, not a quote — based on each vendor's published " +
        "pricing as of when this project's stack was last checked against it " +
        '(see the link on each line). Pricing pages change; verify current ' +
        'pricing before committing to a plan.',
      '',
    ];

    const hasAnything =
      summary.estimated.length +
        summary.free.length +
        summary.usageBased.length +
        summary.unknown.length >
      0;

    if (!hasAnything) {
      parts.push('No third-party services selected — nothing to estimate.', '');
      vfs.write('docs/costs.md', `${parts.join('\n').trimEnd()}\n`);
      return;
    }

    if (summary.estimated.length > 0) {
      parts.push(`## Estimated monthly total: $${summary.totalUsd}/mo`, '');
      for (const item of summary.estimated) parts.push(estimatedLine(item));
      parts.push('');
    } else {
      parts.push(
        '## Estimated monthly total: $0/mo',
        '',
        'Nothing in this stack has a known flat or freemium cost — see the ' +
          'sections below for what *does* cost something, just not a fixed ' +
          'amount.',
        '',
      );
    }

    if (summary.usageBased.length > 0) {
      parts.push(
        '## Usage-based (not included in the total above)',
        '',
        'These bill on your actual traffic, storage or transaction volume — ' +
          'there is no single number that would be honest here.',
        '',
      );
      for (const item of summary.usageBased) parts.push(usageBasedLine(item));
      parts.push('');
    }

    if (summary.free.length > 0) {
      parts.push('## Free', '');
      for (const item of summary.free) parts.push(freeLine(item));
      parts.push('');
    }

    if (summary.unknown.length > 0) {
      parts.push(
        '## No cost data available',
        '',
        "This project's `ai-project-bootstrap` version has no pricing " +
          'information for these — check each vendor directly.',
        '',
      );
      for (const item of summary.unknown) parts.push(`- **${item.moduleName}**`);
      parts.push('');
    }

    vfs.write('docs/costs.md', `${parts.join('\n').trimEnd()}\n`);
  },
};

function estimatedLine(item: CostLineItem): string {
  const pricing = item.pricing as NonNullable<CostLineItem['pricing']>;
  const tier = pricing.model === 'freemium' ? ' (paid tier)' : '';
  const link = pricing.url ? ` — [pricing](${pricing.url})` : '';
  const notes = pricing.notes ? `\n  ${pricing.notes}` : '';
  return `- **${item.moduleName}** — $${pricing.estimateUsd}/mo${tier}${link}${notes}`;
}

function usageBasedLine(item: CostLineItem): string {
  const pricing = item.pricing as NonNullable<CostLineItem['pricing']>;
  const link = pricing.url ? ` — [pricing](${pricing.url})` : '';
  const notes = pricing.notes ? `\n  ${pricing.notes}` : '';
  return `- **${item.moduleName}**${link}${notes}`;
}

function freeLine(item: CostLineItem): string {
  const pricing = item.pricing as NonNullable<CostLineItem['pricing']>;
  const notes = pricing.notes ? ` — ${pricing.notes}` : '';
  return `- **${item.moduleName}**${notes}`;
}
