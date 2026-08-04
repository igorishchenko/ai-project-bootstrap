import type { EnvVar } from '../types.js';

export interface EnvContribution {
  moduleId: string;
  moduleName: string;
  vars: EnvVar[];
}

export interface MergedEnv {
  content: string;
  /** Duplicate keys across modules, reported as warnings. */
  warnings: string[];
}

/**
 * Renders `.env.example`, grouped by module with a comment per variable.
 *
 * A key declared by two modules is emitted once, under the first module that
 * declared it, and the collision is reported — silently keeping one of two
 * different descriptions would be the confusing outcome.
 */
export function mergeEnv(contributions: EnvContribution[]): MergedEnv {
  const seen = new Map<string, string>(); // key -> owning module id
  const warnings: string[] = [];
  const sections: string[] = [];

  for (const contribution of contributions) {
    const lines: string[] = [];

    for (const variable of contribution.vars) {
      const owner = seen.get(variable.key);
      if (owner !== undefined) {
        if (owner !== contribution.moduleId) {
          warnings.push(
            `${variable.key} is declared by both ${owner} and ${contribution.moduleId}; keeping ${owner}'s description.`,
          );
        }
        continue;
      }
      seen.set(variable.key, contribution.moduleId);

      if (variable.description) lines.push(`# ${variable.description}`);
      lines.push(`# ${variable.required ? 'Required' : 'Optional'}`);
      lines.push(`${variable.key}=${variable.example}`);
      lines.push('');
    }

    if (lines.length === 0) continue;
    sections.push([`# ─── ${contribution.moduleName} ───`, '', ...lines].join('\n'));
  }

  const header = [
    '# Environment variables for this project.',
    '# Copy to .env and fill in the real values. Never commit .env.',
    '',
  ].join('\n');

  return {
    content: sections.length > 0 ? `${header}\n${sections.join('\n')}` : `${header}\n`,
    warnings,
  };
}
