import { z } from 'zod';
import type { Manifest } from '../types.js';
import { GeneratorError } from '../resolve/errors.js';

/** Module ids are used as filenames and env comments — keep them boring. */
const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Optional — most modules genuinely have no cost of their own (a testing
 * library, a UI feature) and forcing a value would be more misleading than
 * omitting one. `estimateUsd` only makes sense for `flat`/`freemium`; a
 * `usage-based` or `free` module should leave it unset rather than guess.
 */
const pricingSchema = z
  .object({
    model: z.enum(['free', 'flat', 'usage-based', 'freemium']),
    estimateUsd: z.number().min(0).optional(),
    notes: z.string().min(1).optional(),
    url: z.string().url().optional(),
  })
  .optional();

export const manifestSchema = z.object({
  id: z.string().regex(idPattern, 'must be kebab-case (lowercase letters, digits, hyphens)'),
  name: z.string().min(1),
  category: z.string().regex(idPattern, 'must be kebab-case'),
  description: z.string().min(1),
  requires: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  priority: z.number().int().min(0).default(50),
  pricing: pricingSchema,
});

/**
 * Parses and validates a manifest, converting zod's output into a
 * `GeneratorError` that names the offending file.
 */
export function parseManifest(raw: unknown, sourcePath: string): Manifest {
  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new GeneratorError(
      'INVALID_MANIFEST',
      `Invalid manifest at ${sourcePath}:\n${details}`,
      'Compare it against an existing module manifest; every field except requires/conflicts/dependencies/priority is required.',
    );
  }
  return result.data;
}
