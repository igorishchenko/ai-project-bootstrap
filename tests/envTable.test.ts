import { describe, expect, it } from 'vitest';
import { parseEnvTable } from '../src/core/registry/envTable.js';
import { GeneratorError } from '../src/core/resolve/errors.js';

const TABLE = `
# Some prose the parser should ignore.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| \`API_URL\` | Yes | Where the API lives | \`https://api.example.com\` |
| \`DEBUG\` | No | Verbose logging | \`false\` |

More prose afterwards.
`;

describe('parseEnvTable', () => {
  it('extracts variables and strips backticks', () => {
    const vars = parseEnvTable(TABLE, 'env.md');

    expect(vars).toEqual([
      { key: 'API_URL', required: true, description: 'Where the API lives', example: 'https://api.example.com' },
      { key: 'DEBUG', required: false, description: 'Verbose logging', example: 'false' },
    ]);
  });

  it('stops at the end of the table rather than consuming later prose', () => {
    expect(parseEnvTable(TABLE, 'env.md')).toHaveLength(2);
  });

  it('returns nothing for a file with no table', () => {
    expect(parseEnvTable('# Just prose\n\nNo variables here.', 'env.md')).toEqual([]);
  });

  it('accepts columns in any order', () => {
    const vars = parseEnvTable(
      '| Description | Key | Example | Required |\n| --- | --- | --- | --- |\n| Desc | KEY | ex | yes |',
      'env.md',
    );
    expect(vars[0]).toEqual({ key: 'KEY', required: true, description: 'Desc', example: 'ex' });
  });

  it('treats several affirmative spellings as required', () => {
    const parse = (value: string) =>
      parseEnvTable(
        `| Key | Required | Description | Example |\n| --- | --- | --- | --- |\n| K | ${value} | d | e |`,
        'env.md',
      )[0]?.required;

    expect(parse('Yes')).toBe(true);
    expect(parse('true')).toBe(true);
    expect(parse('✅')).toBe(true);
    expect(parse('No')).toBe(false);
    expect(parse('')).toBe(false);
  });

  it('handles an escaped pipe inside a description', () => {
    const vars = parseEnvTable(
      '| Key | Required | Description | Example |\n| --- | --- | --- | --- |\n| K | No | a \\| b | e |',
      'env.md',
    );
    expect(vars[0]?.description).toBe('a | b');
  });

  it('rejects a table whose header lacks the required columns', () => {
    expect(() =>
      parseEnvTable('| Name | Value |\n| --- | --- |\n| A | B |', 'env.md'),
    ).toThrow(GeneratorError);
  });

  it('rejects a variable declared twice in one module', () => {
    expect(() =>
      parseEnvTable(
        '| Key | Required | Description | Example |\n| --- | --- | --- | --- |\n| K | No | a | 1 |\n| K | No | b | 2 |',
        'env.md',
      ),
    ).toThrow(/twice/);
  });
});
