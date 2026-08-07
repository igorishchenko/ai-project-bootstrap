import { describe, expect, it } from 'vitest';
import { summarizeCosts } from '../src/core/pricing.js';
import type { LoadedModule, Manifest, Pricing } from '../src/core/types.js';

function fakeModule(id: string, name: string, pricing?: Pricing): LoadedModule {
  const manifest: Manifest = {
    id,
    name,
    category: 'backend',
    description: '',
    requires: [],
    conflicts: [],
    dependencies: [],
    priority: 50,
    pricing,
  };
  return {
    manifest,
    root: '/fake',
    isBase: false,
    env: [],
    folders: [],
    prompts: [],
    checklists: [],
    templates: [],
  };
}

describe('summarizeCosts', () => {
  it('sums flat and freemium modules into totalUsd', () => {
    const modules = [
      fakeModule('supabase', 'Supabase', { model: 'freemium', estimateUsd: 25 }),
      fakeModule('sentry', 'Sentry', { model: 'freemium', estimateUsd: 26 }),
    ];

    const summary = summarizeCosts(modules);

    expect(summary.totalUsd).toBe(51);
    expect(summary.estimated.map((item) => item.moduleId)).toEqual(['supabase', 'sentry']);
  });

  it('keeps usage-based modules out of the total, in their own bucket', () => {
    const modules = [
      fakeModule('supabase', 'Supabase', { model: 'freemium', estimateUsd: 25 }),
      fakeModule('stripe', 'Stripe', { model: 'usage-based', notes: '2.9% + 30¢' }),
    ];

    const summary = summarizeCosts(modules);

    expect(summary.totalUsd).toBe(25);
    expect(summary.usageBased.map((item) => item.moduleId)).toEqual(['stripe']);
    expect(summary.estimated.map((item) => item.moduleId)).toEqual(['supabase']);
  });

  it('buckets free modules separately, at $0, not silently omitted', () => {
    const modules = [fakeModule('expo-notifications', 'Expo Push', { model: 'free' })];

    const summary = summarizeCosts(modules);

    expect(summary.free.map((item) => item.moduleId)).toEqual(['expo-notifications']);
    expect(summary.totalUsd).toBe(0);
    expect(summary.estimated).toEqual([]);
  });

  it('buckets a module with no pricing field at all as unknown, not free', () => {
    const modules = [fakeModule('jest', 'Jest', undefined)];

    const summary = summarizeCosts(modules);

    expect(summary.unknown.map((item) => item.moduleId)).toEqual(['jest']);
    expect(summary.free).toEqual([]);
  });

  it('treats a declared flat/freemium module with no estimateUsd as unknown, not a silent $0', () => {
    const modules = [fakeModule('mystery', 'Mystery Vendor', { model: 'flat' })];

    const summary = summarizeCosts(modules);

    expect(summary.unknown.map((item) => item.moduleId)).toEqual(['mystery']);
    expect(summary.totalUsd).toBe(0);
  });

  it('handles an all-unknown-pricing selection without crashing', () => {
    const modules = [fakeModule('jest', 'Jest'), fakeModule('react-native', 'React Native')];

    const summary = summarizeCosts(modules);

    expect(summary.totalUsd).toBe(0);
    expect(summary.estimated).toEqual([]);
    expect(summary.usageBased).toEqual([]);
    expect(summary.free).toEqual([]);
    expect(summary.unknown).toHaveLength(2);
  });

  it('handles an empty module list without crashing', () => {
    expect(summarizeCosts([])).toEqual({
      estimated: [],
      free: [],
      usageBased: [],
      unknown: [],
      totalUsd: 0,
    });
  });

  it('ignores the base pseudo-module even if it somehow carried pricing', () => {
    const base: LoadedModule = { ...fakeModule('base', 'Base'), isBase: true };
    const modules = [
      base,
      fakeModule('supabase', 'Supabase', { model: 'freemium', estimateUsd: 25 }),
    ];

    const summary = summarizeCosts(modules);

    expect(summary.estimated.map((item) => item.moduleId)).toEqual(['supabase']);
  });
});
