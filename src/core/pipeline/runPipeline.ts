import type { BuildContext, Builder } from '../types.js';
import { VirtualFs } from '../vfs/virtualFs.js';

export interface BuilderRun {
  id: string;
  label: string;
  /** False when the builder was skipped via --skip. */
  ran: boolean;
}

export interface PipelineResult {
  vfs: VirtualFs;
  runs: BuilderRun[];
  warnings: string[];
}

export interface RunOptions {
  skip?: string[];
  /** Called after each builder, for progress reporting. */
  onBuilder?: (run: BuilderRun) => void;
}

/**
 * Runs every builder against a fresh virtual filesystem.
 *
 * Nothing reaches disk here — the caller flushes the result once every builder
 * has succeeded, so a failure leaves no half-written project behind.
 */
export function runPipeline(
  ctx: BuildContext,
  builders: Builder[],
  options: RunOptions = {},
): PipelineResult {
  const vfs = new VirtualFs();
  const skip = new Set(options.skip ?? []);
  const runs: BuilderRun[] = [];

  for (const builder of builders) {
    const run: BuilderRun = { id: builder.id, label: builder.label, ran: !skip.has(builder.id) };

    if (run.ran) {
      // Tagging ownership lets the VFS name both builders on a path collision.
      vfs.setOwner(builder.id);
      builder.build(ctx, vfs);
    }

    runs.push(run);
    options.onBuilder?.(run);
  }

  return { vfs, runs, warnings: ctx.warnings };
}
