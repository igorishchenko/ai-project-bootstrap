import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { looksLikePath, resolveProjectTarget, validateProjectInput } from '../src/cli/projectTarget.js';

/**
 * The project name doubles as its location: a path answer must create that
 * folder and name the project after its last segment, so the directory you get
 * and the project inside it never disagree.
 */
const cwd = path.resolve('/work');

describe('resolveProjectTarget', () => {
  it('generates a bare name into ./<slug>', () => {
    const target = resolveProjectTarget({ name: 'My App', cwd });

    expect(target.projectName).toBe('My App');
    expect(target.targetDir).toBe(path.join(cwd, 'my-app'));
  });

  it('creates the folder a path answer describes, named after its last segment', () => {
    const target = resolveProjectTarget({ name: './something/my-proj', cwd });

    expect(target.projectName).toBe('my-proj');
    expect(target.targetDir).toBe(path.join(cwd, 'something', 'my-proj'));
  });

  it('accepts a path without a leading ./', () => {
    const target = resolveProjectTarget({ name: 'apps/web/my-proj', cwd });

    expect(target.projectName).toBe('my-proj');
    expect(target.targetDir).toBe(path.join(cwd, 'apps', 'web', 'my-proj'));
  });

  it('ignores a trailing slash', () => {
    const target = resolveProjectTarget({ name: './something/my-proj/', cwd });

    expect(target.projectName).toBe('my-proj');
    expect(target.targetDir).toBe(path.join(cwd, 'something', 'my-proj'));
  });

  it('resolves a path that climbs out of the current directory', () => {
    const target = resolveProjectTarget({ name: '../siblings/my-proj', cwd });

    expect(target.projectName).toBe('my-proj');
    expect(target.targetDir).toBe(path.resolve(cwd, '..', 'siblings', 'my-proj'));
  });

  it('expands a leading ~', () => {
    const target = resolveProjectTarget({ name: '~/code/my-proj', cwd });

    expect(target.projectName).toBe('my-proj');
    expect(target.targetDir).toBe(path.join(os.homedir(), 'code', 'my-proj'));
  });

  it('names the project after the current directory for "."', () => {
    const target = resolveProjectTarget({ name: '.', cwd });

    expect(target.projectName).toBe('work');
    expect(target.targetDir).toBe(cwd);
  });

  it('does not slugify the folder the user spelled out', () => {
    // The path is a location the user typed, not a name we derive — honour it.
    const target = resolveProjectTarget({ name: './packages/My_Proj', cwd });

    expect(target.projectName).toBe('My_Proj');
    expect(target.targetDir).toBe(path.join(cwd, 'packages', 'My_Proj'));
  });

  it('lets --out override the location without touching the name', () => {
    const target = resolveProjectTarget({ name: './apps/my-proj', out: '.', cwd });

    expect(target.projectName).toBe('my-proj');
    expect(target.targetDir).toBe(cwd);
  });

  it('keeps --out working for a bare name', () => {
    const target = resolveProjectTarget({ name: 'My App', out: './elsewhere', cwd });

    expect(target.projectName).toBe('My App');
    expect(target.targetDir).toBe(path.join(cwd, 'elsewhere'));
  });

  it('rejects an empty name', () => {
    expect(() => resolveProjectTarget({ name: '   ', cwd })).toThrow(/empty/i);
  });

  it('rejects a path with nothing to name the project after', () => {
    expect(() => resolveProjectTarget({ name: './apps/@@', cwd })).toThrow(/Cannot derive/);
    expect(() => resolveProjectTarget({ name: '/', cwd })).toThrow(/Cannot derive/);
  });
});

describe('looksLikePath', () => {
  it('treats separators, dots and ~ as a location', () => {
    for (const value of ['./a/b', 'a/b', '.', '..', '~/code/app', 'a\\b']) {
      expect(looksLikePath(value), value).toBe(true);
    }
  });

  it('treats a plain name as a name', () => {
    for (const value of ['my-app', 'My App', 'my.app']) {
      expect(looksLikePath(value), value).toBe(false);
    }
  });
});

describe('validateProjectInput', () => {
  it('passes a usable answer and explains an unusable one', () => {
    expect(validateProjectInput('./apps/my-proj')).toBeUndefined();
    expect(validateProjectInput('./apps/@@')).toMatch(/Cannot derive/);
  });
});
