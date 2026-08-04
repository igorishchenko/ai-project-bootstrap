import type { Builder, BuildContext, LoadedModule } from '../core/types.js';
import { render } from '../core/template/render.js';
import { templateData } from '../core/pipeline/buildContext.js';

/**
 * Assembles `docs/setup.md` — the onboarding document.
 *
 * Each module contributes a `setup.md` body, which the builder frames with a
 * heading, its declared packages and install commands, and its iOS/Android
 * notes. The module writes the prose; the builder writes the structure.
 */
export const docsBuilder: Builder = {
  id: 'docs',
  label: 'Generated setup.md',
  order: 40,
  build(ctx, vfs) {
    const data = templateData(ctx);
    const contributors = ctx.modules.filter((module) => hasSetupContent(module));

    const sections = contributors.map((module) => {
      const parts: string[] = [`## ${module.manifest.name}`, '', module.manifest.description, ''];

      if (module.setup) parts.push(render(module.setup, data).trim(), '');

      const packages = module.dependencies?.packages ?? [];
      if (packages.length > 0) {
        parts.push('### Packages', '');
        parts.push('| Package | Version | Kind |');
        parts.push('| --- | --- | --- |');
        for (const spec of packages) {
          const kind = [spec.peer && 'peer', spec.dev && 'dev', spec.native && 'native']
            .filter(Boolean)
            .join(', ');
          parts.push(`| \`${spec.name}\` | \`${spec.version}\` | ${kind || 'runtime'} |`);
        }
        parts.push('');

        const native = packages.filter((spec) => spec.native);
        if (native.length > 0) {
          parts.push(
            `> Native module${native.length > 1 ? 's' : ''}: ${native
              .map((spec) => `\`${spec.name}\``)
              .join(', ')}. A JS-only reload will not pick these up — rebuild the app.`,
            '',
          );
        }
      }

      const install = module.dependencies?.install ?? [];
      if (install.length > 0) {
        parts.push('### Install', '', '```bash', ...install, '```', '');
      }

      const variables = module.env;
      if (variables.length > 0) {
        parts.push('### Environment variables', '');
        parts.push('| Key | Required | Description |');
        parts.push('| --- | --- | --- |');
        for (const variable of variables) {
          parts.push(
            `| \`${variable.key}\` | ${variable.required ? 'Yes' : 'No'} | ${render(variable.description, data)} |`,
          );
        }
        parts.push('');
      }

      if (module.ios) parts.push('### iOS configuration', '', render(module.ios, data).trim(), '');
      if (module.android) {
        parts.push('### Android configuration', '', render(module.android, data).trim(), '');
      }

      return parts.join('\n').trimEnd();
    });

    const toc = contributors.map(
      (module) => `- [${module.manifest.name}](#${anchor(module.manifest.name)})`,
    );

    const document = [
      `# ${ctx.projectName} — Setup`,
      '',
      'Everything needed to take this project from a fresh clone to a running app.',
      'Work top to bottom; each section is self-contained.',
      '',
      '## Contents',
      '',
      ...toc,
      '',
      '---',
      '',
      sections.join('\n\n---\n\n'),
      '',
    ].join('\n');

    vfs.write('docs/setup.md', document);
  },
};

function hasSetupContent(module: LoadedModule): boolean {
  return Boolean(
    module.setup ||
      module.ios ||
      module.android ||
      module.env.length > 0 ||
      (module.dependencies?.packages ?? []).length > 0 ||
      (module.dependencies?.install ?? []).length > 0,
  );
}

/** GitHub-style heading anchor. */
export function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export type { BuildContext };
