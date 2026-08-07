import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

function select(choices: Selection['choices']): Selection {
  return { projectName: 'Demo App', choices };
}

function roadmapDoc(selection: Selection): string {
  const result = generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
  const content = result.vfs.read('docs/roadmap.md');
  expect(content, 'docs/roadmap.md should exist').toBeDefined();
  return content as string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every `## Week N` heading's bullet lines, in document order. */
function weeks(doc: string): string[][] {
  const sections = doc.split(/^## Week \d+$/m).slice(1);
  return sections.map((section) =>
    section
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- ')),
  );
}

describe('roadmapBuilder', () => {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'tests/fixtures/ci-full-stack.json'), 'utf8'),
  ) as Selection;
  const doc = roadmapDoc(fixture);
  const weekLists = weeks(doc);
  const allLines = weekLists.flat();

  it('names every selected non-platform module exactly once', () => {
    const expectedNames = [
      'Supabase',
      'Supabase Auth',
      'SQLite',
      'RevenueCat',
      'PostHog',
      'Sentry',
      'Expo Push',
      'Supabase Storage',
      'Resend',
      'Better Stack',
      'GitHub Actions',
      'Jest',
      'EAS Submit',
    ];

    // Exact module names, not substrings — "Supabase" alone must not match
    // the "Supabase Auth" or "Supabase Storage" lines it's a prefix of.
    for (const name of expectedNames) {
      const occurrences = allLines.filter((line) =>
        new RegExp(`(— |, )${escapeRegExp(name)}(,|\\s\\(|$)`).test(line),
      );
      expect(
        occurrences,
        `"${name}" should appear exactly once in:\n${allLines.join('\n')}`,
      ).toHaveLength(1);
    }
  });

  it('excludes platform-choice categories — Expo and React Native never get their own line', () => {
    expect(doc).not.toContain('Mobile platform');
    expect(doc).not.toContain('Web framework');
    expect(allLines.some((line) => line.includes('**Expo**') || line.endsWith('Expo'))).toBe(false);
  });

  it('orders items by category.order — backend, then auth, then database, ...', () => {
    const categoryLabels = allLines.map(
      (line) => (line.match(/\*\*(.+?)\*\*/) as RegExpMatchArray)[1],
    );
    expect(categoryLabels).toEqual([
      'Backend',
      'Authentication',
      'Database',
      'Payments',
      'Analytics',
      'Crash Reporting',
      'Notifications',
      'Storage',
      'Email',
      'Monitoring',
      'CI/CD',
      'Testing',
      'Deployment',
    ]);
  });

  it('caps items per week and adds weeks as needed, without splitting unevenly', () => {
    expect(weekLists.length).toBe(5);
    for (const week of weekLists.slice(0, -1)) expect(week.length).toBe(3);
    expect(weekLists.at(-1)?.length).toBe(1);
  });

  it('references the exact implement command for a category a feature covers', () => {
    const authLine = allLines.find((line) => line.includes('Authentication')) as string;
    expect(authLine).toContain('ai-project-bootstrap implement authentication');

    const paymentsLine = allLines.find((line) => line.includes('Payments')) as string;
    expect(paymentsLine).toContain('ai-project-bootstrap implement payments');

    const notificationsLine = allLines.find((line) => line.includes('Notifications')) as string;
    expect(notificationsLine).toContain('ai-project-bootstrap implement push-notifications');
  });

  it('does not invent an implement reference for a category with no matching feature', () => {
    const databaseLine = allLines.find((line) => line.includes('Database')) as string;
    expect(databaseLine).not.toContain('implement');
  });

  it('frames the plan as a suggestion to adjust, not a schedule to follow', () => {
    expect(doc.toLowerCase()).toMatch(/not a schedule|reorder/);
  });

  it('scales week count with a smaller selection', () => {
    const small = roadmapDoc(select({ target: 'web', web: 'nextjs', auth: 'auth0' }));
    const smallWeeks = weeks(small);
    expect(smallWeeks.length).toBe(1);
    expect(smallWeeks[0]).toHaveLength(1);
    expect(smallWeeks[0]?.[0]).toContain('Auth0');
  });

  it('says plainly there is nothing to schedule when only the base project is selected', () => {
    const bare = roadmapDoc(select({ target: 'web', web: 'nextjs' }));
    expect(weeks(bare)).toHaveLength(0);
    expect(bare.toLowerCase()).toContain('nothing to sequence');
  });
});
