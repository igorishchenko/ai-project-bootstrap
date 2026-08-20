import type { Builder } from '../core/types.js';
import { folderBuilder, gitkeepBuilder } from './folderBuilder.js';
import { packageBuilder } from './packageBuilder.js';
import { envBuilder } from './envBuilder.js';
import { docsBuilder } from './docsBuilder.js';
import { architectureBuilder } from './architectureBuilder.js';
import { roadmapBuilder } from './roadmapBuilder.js';
import { costsBuilder } from './costsBuilder.js';
import { configBuilder } from './configBuilder.js';
import {
  checklistBuilder,
  claudeBuilder,
  cursorBuilder,
  githubBuilder,
  hygieneBuilder,
  promptBuilder,
  readmeBuilder,
  templateBuilder,
} from './assetBuilders.js';
import { clineBuilder, continueBuilder, copilotBuilder, rooBuilder } from './aiProviderBuilders.js';
import { packBuilder } from './packBuilder.js';

/**
 * The builder registry.
 *
 * Each builder is independent and declares its own order; the pipeline just
 * sorts and runs them. Adding a builder means adding it here — adding a
 * *technology* means touching nothing in this directory at all.
 */
export const builders: Builder[] = [
  folderBuilder,
  packageBuilder,
  envBuilder,
  docsBuilder,
  architectureBuilder,
  roadmapBuilder,
  costsBuilder,
  cursorBuilder,
  copilotBuilder,
  continueBuilder,
  clineBuilder,
  rooBuilder,
  claudeBuilder,
  promptBuilder,
  checklistBuilder,
  githubBuilder,
  hygieneBuilder,
  templateBuilder,
  packBuilder,
  readmeBuilder,
  configBuilder,
  gitkeepBuilder,
].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function builderIds(): string[] {
  return builders.map((builder) => builder.id);
}
