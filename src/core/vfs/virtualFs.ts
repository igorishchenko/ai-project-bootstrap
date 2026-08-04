import fs from 'node:fs';
import path from 'node:path';
import type { VirtualFsLike } from '../types.js';
import { GeneratorError } from '../resolve/errors.js';
import { mergeJson } from '../merge/mergeJson.js';

export interface FlushOptions {
  dryRun?: boolean;
  force?: boolean;
  /** Paths to leave exactly as they are on disk — see `preservedPaths`. */
  preserve?: ReadonlySet<string>;
}

export interface FlushResult {
  files: string[];
  directories: string[];
  /** Files that existed and were left untouched because of `preserve`. */
  preserved: string[];
}

/**
 * An in-memory project tree.
 *
 * Builders write here, never to disk. Nothing is persisted until every builder
 * has succeeded, which means a failure halfway through leaves the user's
 * filesystem untouched, `--dry-run` costs nothing, and tests can assert on the
 * whole tree without touching a temp directory.
 */
export class VirtualFs implements VirtualFsLike {
  private readonly files = new Map<string, string>();
  private readonly directories = new Set<string>();
  /** Which builder wrote each path, so collisions can name both culprits. */
  private readonly owners = new Map<string, string>();
  private currentOwner = 'unknown';

  /** Tags subsequent writes with the builder responsible for them. */
  setOwner(owner: string): void {
    this.currentOwner = owner;
  }

  write(filePath: string, content: string): void {
    const key = normalize(filePath);
    const existingOwner = this.owners.get(key);
    if (existingOwner !== undefined && existingOwner !== this.currentOwner) {
      throw new GeneratorError(
        'PATH_COLLISION',
        `Both the "${existingOwner}" and "${this.currentOwner}" builders write ${key}.`,
        'Give one of them a distinct output path, or merge the content in a single builder.',
      );
    }
    this.owners.set(key, this.currentOwner);
    this.files.set(key, content);
    this.mkdir(path.posix.dirname(key));
  }

  writeJson(filePath: string, value: unknown): void {
    this.write(filePath, `${JSON.stringify(value, null, 2)}\n`);
  }

  /** Deep-merges into an existing JSON file, or creates it. */
  mergeJson(filePath: string, value: Record<string, unknown>): void {
    const key = normalize(filePath);
    const existing = this.files.get(key);
    const base = existing ? (JSON.parse(existing) as Record<string, unknown>) : {};
    // Re-tag ownership so repeated merges by the same builder stay legal.
    this.owners.set(key, this.currentOwner);
    this.files.set(key, `${JSON.stringify(mergeJson(base, value), null, 2)}\n`);
    this.mkdir(path.posix.dirname(key));
  }

  mkdir(dirPath: string): void {
    const key = normalize(dirPath);
    if (!key || key === '.') return;
    // Register every ancestor so empty scaffolding folders survive to disk.
    const segments = key.split('/');
    for (let i = 1; i <= segments.length; i += 1) {
      this.directories.add(segments.slice(0, i).join('/'));
    }
  }

  has(filePath: string): boolean {
    return this.files.has(normalize(filePath));
  }

  read(filePath: string): string | undefined {
    return this.files.get(normalize(filePath));
  }

  /** Sorted snapshot — used by tests and the final report. */
  snapshot(): { files: string[]; directories: string[] } {
    return {
      files: [...this.files.keys()].sort(),
      directories: [...this.directories].sort(),
    };
  }

  entries(): Array<[string, string]> {
    return [...this.files.entries()].sort(([a], [b]) => a.localeCompare(b));
  }

  /** Writes the tree to disk. With `dryRun`, reports what it would write. */
  flush(targetDir: string, options: FlushOptions = {}): FlushResult {
    const preserve = options.preserve ?? new Set<string>();
    const preserved = [...this.files.keys()].filter((file) => preserve.has(file)).sort();

    const result: FlushResult = {
      files: [...this.files.keys()].filter((file) => !preserve.has(file)).sort(),
      directories: [...this.directories].sort(),
      preserved,
    };

    if (options.dryRun) return result;

    if (fs.existsSync(targetDir)) {
      const existing = fs.readdirSync(targetDir).filter((name) => name !== '.git');
      if (existing.length > 0 && !options.force) {
        throw new GeneratorError(
          'TARGET_NOT_EMPTY',
          `${targetDir} is not empty.`,
          'Choose an empty directory with --out, or pass --force to write into it anyway.',
        );
      }
    }

    for (const dir of result.directories) {
      fs.mkdirSync(path.join(targetDir, ...dir.split('/')), { recursive: true });
    }
    for (const [file, content] of this.files) {
      if (preserve.has(file)) continue; // edited since generation — leave it
      const full = path.join(targetDir, ...file.split('/'));
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    }

    return result;
  }
}

/** Normalises to POSIX separators and strips leading `./` and `/`. */
function normalize(filePath: string): string {
  const posix = filePath.split(path.sep).join('/');
  const cleaned = path.posix.normalize(posix).replace(/^\.\//, '').replace(/^\//, '');
  if (cleaned.startsWith('..')) {
    throw new GeneratorError(
      'PATH_COLLISION',
      `Refusing to write outside the project: ${filePath}`,
      'Module template paths must stay inside the generated project.',
    );
  }
  return cleaned === '.' ? '' : cleaned;
}
