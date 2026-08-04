import { describe, expect, it } from 'vitest';
import { resolveSelection } from '../src/core/resolve/resolveSelection.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import type { Selection } from '../src/core/types.js';
import { makeModule, makeRegistry } from './helpers/modules.js';

function select(choices: Selection['choices']): Selection {
  return { projectName: 'Test', choices };
}

const ids = (result: { modules: Array<{ manifest: { id: string } }> }): string[] =>
  result.modules.map((module) => module.manifest.id);

describe('resolveSelection', () => {
  it('pulls in requires transitively', () => {
    const registry = makeRegistry([
      makeModule({ id: 'base-platform', priority: 10 }),
      makeModule({ id: 'platform', requires: ['base-platform'], priority: 20 }),
      makeModule({ id: 'payments', requires: ['platform'], priority: 30 }),
    ]);

    const result = resolveSelection(select({ payments: 'payments' }), registry);

    expect(ids(result)).toEqual(['base-platform', 'platform', 'payments']);
    expect(result.autoIncluded).toEqual(['base-platform', 'platform']);
  });

  it('does not report an explicitly chosen module as auto-included', () => {
    const registry = makeRegistry([
      makeModule({ id: 'platform', priority: 10 }),
      makeModule({ id: 'payments', requires: ['platform'], priority: 20 }),
    ]);

    const result = resolveSelection(
      select({ platform: 'platform', payments: 'payments' }),
      registry,
    );

    expect(result.autoIncluded).toEqual([]);
  });

  it('places a prerequisite immediately before its dependent, not after unrelated modules', () => {
    // Regression: a wave-based sort emitted every ready module first, pushing
    // a low-priority prerequisite's dependent to the end of the document.
    const registry = makeRegistry([
      makeModule({ id: 'runtime', priority: 10 }),
      makeModule({ id: 'framework', requires: ['runtime'], priority: 20 }),
      makeModule({ id: 'database', priority: 30 }),
      makeModule({ id: 'analytics', priority: 70 }),
    ]);

    const result = resolveSelection(
      select({ platform: 'framework', backend: 'database', analytics: ['analytics'] }),
      registry,
    );

    expect(ids(result)).toEqual(['runtime', 'framework', 'database', 'analytics']);
  });

  it('orders by priority, then id, for independent modules', () => {
    const registry = makeRegistry([
      makeModule({ id: 'zeta', priority: 10 }),
      makeModule({ id: 'alpha', priority: 10 }),
      makeModule({ id: 'later', priority: 90 }),
    ]);

    const result = resolveSelection(
      select({ a: 'later', b: 'zeta', c: 'alpha' }),
      registry,
    );

    expect(ids(result)).toEqual(['alpha', 'zeta', 'later']);
  });

  it('is order-independent: the same set resolves identically however it was chosen', () => {
    const registry = makeRegistry([
      makeModule({ id: 'runtime', priority: 10 }),
      makeModule({ id: 'framework', requires: ['runtime'], priority: 20 }),
      makeModule({ id: 'database', priority: 30 }),
    ]);

    const first = resolveSelection(select({ a: 'framework', b: 'database' }), registry);
    const second = resolveSelection(select({ b: 'database', a: 'framework' }), registry);

    expect(ids(first)).toEqual(ids(second));
  });

  it('rejects conflicting modules and names both', () => {
    const registry = makeRegistry([
      makeModule({ id: 'supa', name: 'Supa', conflicts: ['fire'] }),
      makeModule({ id: 'fire', name: 'Fire' }),
    ]);

    expect(() => resolveSelection(select({ a: 'supa', b: 'fire' }), registry)).toThrow(
      /Supa.*Fire|Fire.*Supa/,
    );
  });

  it('detects a conflict declared in only one direction', () => {
    const registry = makeRegistry([
      makeModule({ id: 'a' }),
      makeModule({ id: 'b', conflicts: ['a'] }),
    ]);

    expect(() => resolveSelection(select({ x: 'a', y: 'b' }), registry)).toThrow(GeneratorError);
  });

  it('ignores a conflict with a module that is not selected', () => {
    const registry = makeRegistry([
      makeModule({ id: 'supa', conflicts: ['fire'] }),
      makeModule({ id: 'fire' }),
    ]);

    expect(ids(resolveSelection(select({ a: 'supa' }), registry))).toEqual(['supa']);
  });

  it('detects a circular dependency and names the cycle', () => {
    const registry = makeRegistry([
      makeModule({ id: 'a', requires: ['b'] }),
      makeModule({ id: 'b', requires: ['a'] }),
    ]);

    expect(() => resolveSelection(select({ x: 'a' }), registry)).toThrow(/Circular dependency/);
  });

  it('detects a longer cycle through soft dependencies', () => {
    const registry = makeRegistry([
      makeModule({ id: 'a', dependencies: ['b'] }),
      makeModule({ id: 'b', dependencies: ['c'] }),
      makeModule({ id: 'c', dependencies: ['a'] }),
    ]);

    expect(() => resolveSelection(select({ x: 'a', y: 'b', z: 'c' }), registry)).toThrow(
      /Circular dependency/,
    );
  });

  it('ignores a soft dependency on a module that is absent', () => {
    const registry = makeRegistry([
      makeModule({ id: 'a', dependencies: ['missing'] }),
    ]);

    expect(ids(resolveSelection(select({ x: 'a' }), registry))).toEqual(['a']);
  });

  it('orders a soft dependency before its dependent when both are present', () => {
    const registry = makeRegistry([
      makeModule({ id: 'late', priority: 90 }),
      makeModule({ id: 'early', priority: 10, dependencies: ['late'] }),
    ]);

    expect(ids(resolveSelection(select({ x: 'early', y: 'late' }), registry))).toEqual([
      'late',
      'early',
    ]);
  });

  it('fails when a required module is not installed', () => {
    const registry = makeRegistry([makeModule({ id: 'payments', requires: ['platform'] })]);

    expect(() => resolveSelection(select({ a: 'payments' }), registry)).toThrow(
      /requires "platform"/,
    );
  });

  it('fails on an unknown module id', () => {
    expect(() => resolveSelection(select({ a: 'nope' }), makeRegistry([]))).toThrow(
      /Unknown module/,
    );
  });

  it('ignores the "none" sentinel and empty multi-select answers', () => {
    const registry = makeRegistry([makeModule({ id: 'a' })]);

    const result = resolveSelection(select({ x: 'a', y: 'none', z: [] }), registry);

    expect(ids(result)).toEqual(['a']);
  });

  it('deduplicates a module selected under two categories', () => {
    const registry = makeRegistry([makeModule({ id: 'a' })]);

    expect(ids(resolveSelection(select({ x: 'a', y: 'a' }), registry))).toEqual(['a']);
  });
});
