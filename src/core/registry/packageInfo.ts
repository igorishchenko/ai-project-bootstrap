import fs from 'node:fs';
import path from 'node:path';

/** The bits of the generator's own `package.json` the CLI needs at runtime. */
export interface GeneratorPackageInfo {
  version: string;
  engines?: { node?: string };
}

const FALLBACK: GeneratorPackageInfo = { version: '0.0.0' };

/** Reads the generator's own `package.json` — falls back quietly if it's missing or malformed. */
export function readGeneratorPackageInfo(rootDir: string): GeneratorPackageInfo {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
      version?: string;
      engines?: { node?: string };
    };
    return { version: pkg.version ?? FALLBACK.version, engines: pkg.engines };
  } catch {
    return FALLBACK;
  }
}
