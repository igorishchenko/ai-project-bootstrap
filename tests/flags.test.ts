import { describe, expect, it } from 'vitest';
import { parseFlags } from '../src/cli/flags.js';

describe('parseFlags', () => {
  it('parses --preset <id>', () => {
    expect(parseFlags(['--preset', 'startup-mvp']).preset).toBe('startup-mvp');
  });

  it('parses --preset=<id>', () => {
    expect(parseFlags(['--preset=startup-mvp']).preset).toBe('startup-mvp');
  });

  it('leaves preset undefined when not given', () => {
    expect(parseFlags([]).preset).toBeUndefined();
  });

  it("parses --preset alongside --config without erroring — rejecting that combination is main()'s job, not the tokenizer's", () => {
    const flags = parseFlags(['--preset', 'startup-mvp', '--config', 'ai-project.config.json']);
    expect(flags.preset).toBe('startup-mvp');
    expect(flags.config).toBe('ai-project.config.json');
  });
});
