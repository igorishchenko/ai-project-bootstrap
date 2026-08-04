import type { Builder } from '../core/types.js';
import { mergeEnv } from '../core/merge/mergeEnv.js';
import { render } from '../core/template/render.js';
import { templateData } from '../core/pipeline/buildContext.js';

/** Merges every module's `env.md` table into a single documented `.env.example`. */
export const envBuilder: Builder = {
  id: 'env',
  label: 'Generated .env.example',
  order: 30,
  build(ctx, vfs) {
    const data = templateData(ctx);

    const { content, warnings } = mergeEnv(
      ctx.modules
        .filter((module) => module.env.length > 0)
        .map((module) => ({
          moduleId: module.manifest.id,
          moduleName: module.manifest.name,
          // Descriptions and examples are authored content, so they get the
          // same template treatment as every other file a module ships.
          vars: module.env.map((variable) => ({
            ...variable,
            description: render(variable.description, data),
            example: render(variable.example, data),
          })),
        })),
    );

    ctx.warnings.push(...warnings);
    vfs.write('.env.example', content);
  },
};
