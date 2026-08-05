import { describe, expect, it } from 'vitest';
import { render } from '../src/core/template/render.js';
import { GeneratorError } from '../src/core/resolve/errors.js';

describe('render', () => {
  it('interpolates plain and dotted paths', () => {
    expect(render('Hello {{name}} from {{project.city}}', { name: 'Ihor', project: { city: 'Kyiv' } })).toBe(
      'Hello Ihor from Kyiv',
    );
  });

  it('renders empty string for missing values', () => {
    expect(render('[{{nope}}]', {})).toBe('[]');
  });

  it('handles if / else', () => {
    const template = '{{#if paid}}Pro{{else}}Free{{/if}}';
    expect(render(template, { paid: true })).toBe('Pro');
    expect(render(template, { paid: false })).toBe('Free');
  });

  it('treats empty arrays as falsy', () => {
    expect(render('{{#if items}}yes{{else}}no{{/if}}', { items: [] })).toBe('no');
    expect(render('{{#if items}}yes{{else}}no{{/if}}', { items: [1] })).toBe('yes');
  });

  it('supports unless', () => {
    expect(render('{{#unless off}}on{{/unless}}', { off: false })).toBe('on');
    expect(render('{{#unless off}}on{{/unless}}', { off: true })).toBe('');
  });

  it('iterates objects with scope access and loop metadata', () => {
    const out = render('{{#each mods}}{{@index}}:{{name}}{{#unless @last}}, {{/unless}}{{/each}}', {
      mods: [{ name: 'a' }, { name: 'b' }],
    });
    expect(out).toBe('0:a, 1:b');
  });

  it('iterates scalars via this, and sees the outer scope', () => {
    expect(render('{{#each xs}}{{prefix}}{{this}} {{/each}}', { xs: [1, 2], prefix: '#' })).toBe('#1 #2 ');
  });

  it('nests blocks', () => {
    const template = '{{#each groups}}{{title}}:{{#each items}} {{this}}{{/each}};{{/each}}';
    const out = render(template, {
      groups: [
        { title: 'a', items: ['x', 'y'] },
        { title: 'b', items: [] },
      ],
    });
    expect(out).toBe('a: x y;b:;');
  });

  it('nests an if inside an each', () => {
    const out = render('{{#each xs}}{{#if ok}}[{{v}}]{{/if}}{{/each}}', {
      xs: [{ ok: true, v: 1 }, { ok: false, v: 2 }],
    });
    expect(out).toBe('[1]');
  });

  it('leaves surrounding text untouched', () => {
    expect(render('# Title\n\n{{body}}\n\nend', { body: 'x' })).toBe('# Title\n\nx\n\nend');
  });

  it('leaves a CI runner expression alone', () => {
    const template = 'group: ${{ github.workflow }}-${{ github.ref }}';
    expect(render(template, {})).toBe(template);
  });

  it('still renders our own tag on a line that also holds a CI expression', () => {
    expect(render('{{name}}: ${{ github.sha }}', { name: 'build' })).toBe('build: ${{ github.sha }}');
  });

  it('rejects an unclosed block', () => {
    expect(() => render('{{#if a}}x', {})).toThrow(GeneratorError);
  });

  it('rejects a stray closing tag', () => {
    expect(() => render('x{{/if}}', {})).toThrow(GeneratorError);
  });

  it('rejects an unknown helper', () => {
    expect(() => render('{{#nope a}}x{{/nope}}', {})).toThrow(GeneratorError);
  });
});
