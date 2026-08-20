import { z } from 'zod';
import { GeneratorError } from '../resolve/errors.js';

/**
 * An organisation's own rules, distributed the way the built-in ones are.
 *
 * A pack is **one JSON document**, not a directory. That is what the service
 * stores, what it serves, and what gets cached on disk — a directory would mean
 * packing and unpacking at every boundary for no gain, since nothing here is
 * hand-authored in a working tree the way `technologies/<id>/` is.
 *
 * What it *does* reuse is the module contract: every rule in a pack becomes a
 * `RuleSource`, the same type `collectRuleSources` already hands to five
 * provider builders. So a pack renders into every AI tool format the generator
 * supports without a single builder learning what a pack is.
 */

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Semver, pinned. `@latest` is deliberately not a thing — see `parsePackRef`. */
const versionPattern = /^\d+\.\d+\.\d+$/;

/**
 * One rule, and the three things it can do.
 *
 * Exactly one of `appliesTo`, `extends` or `replaces` — a rule that both
 * extended and replaced the same built-in would have no defined meaning, and
 * guessing one would be worse than refusing.
 */
export const packRuleSchema = z
  .object({
    id: z.string().regex(slugPattern, 'must be kebab-case'),
    name: z.string().min(1),
    description: z.string().min(1).optional(),
    /** Glob patterns the rule is scoped to. Absent means it always applies. */
    globs: z.array(z.string()).optional(),
    content: z.string().min(1),

    /**
     * **Add.** `["*"]` for every project; module ids to scope it to a stack
     * that actually selected them. A rule scoped to a module nobody selected
     * is silently absent, which is the point — a pack is written once for a
     * fleet with more than one stack in it.
     */
    appliesTo: z.array(z.string()).nonempty().optional(),
    /** **Extend.** Appended below our section, never silently replacing it. */
    extends: z.string().regex(slugPattern).optional(),
    /** **Override.** Ours is dropped entirely, and `check` says so. */
    replaces: z.string().regex(slugPattern).optional(),
  })
  .refine(
    (rule) => [rule.appliesTo, rule.extends, rule.replaces].filter(Boolean).length === 1,
    'set exactly one of appliesTo, extends or replaces',
  );

export const packFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const rulePackSchema = z.object({
  id: z.string().regex(slugPattern, 'must be kebab-case'),
  name: z.string().min(1),
  version: z.string().regex(versionPattern, 'must be an exact semver version'),
  rules: z.array(packRuleSchema).default([]),
  docs: z.array(packFileSchema).default([]),
  checklists: z.array(packFileSchema).default([]),
});

export type PackRule = z.infer<typeof packRuleSchema>;
export type PackFile = z.infer<typeof packFileSchema>;
export type RulePack = z.infer<typeof rulePackSchema>;

/** `acme-standards@2.1.0`, as it appears in `ai-project.config.json`. */
export interface PackRef {
  slug: string;
  version: string;
}

export function formatPackRef(ref: PackRef): string {
  return `${ref.slug}@${ref.version}`;
}

/**
 * Parses `slug@version`.
 *
 * **A floating `@latest` is deliberately not offered.** Two runs of the same
 * command against the same commit must produce the same files, and a rule that
 * changed underneath between them would break that — quietly, and in the one
 * direction nobody checks, since the output would still look plausible.
 * `pack update` exists to move the pin on purpose.
 */
export function parsePackRef(raw: string): PackRef {
  const at = raw.lastIndexOf('@');
  if (at <= 0) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `"${raw}" is not a pinned pack reference.`,
      'Write it as slug@version, e.g. acme-standards@2.1.0.',
    );
  }

  const slug = raw.slice(0, at);
  const version = raw.slice(at + 1);

  if (!slugPattern.test(slug)) {
    throw new GeneratorError('INVALID_CONFIG', `"${slug}" is not a valid pack slug.`);
  }
  if (version === 'latest') {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'A pack cannot be pinned to @latest.',
      'Two runs of the same command must produce the same files. Run `pack update` to move the pin.',
    );
  }
  if (!versionPattern.test(version)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `"${version}" is not an exact version.`,
      'Packs are pinned to an exact version, e.g. acme-standards@2.1.0.',
    );
  }

  return { slug, version };
}

export function parsePack(raw: unknown, source: string): RulePack {
  const parsed = rulePackSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? ` at ${first.path.join('.')}` : '';
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${source} is not a valid rule pack${where}: ${first?.message ?? 'unknown error'}.`,
    );
  }
  return parsed.data;
}
