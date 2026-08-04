import { GeneratorError } from '../resolve/errors.js';

export type TemplateData = Record<string, unknown>;

/**
 * A deliberately small mustache-style renderer.
 *
 * The spec asks for minimal dependencies, and module templates only ever need
 * three things: interpolation, a conditional, and a loop. Output is never
 * HTML-escaped — everything generated here is Markdown, JSON or dotfiles.
 *
 * Supported:
 *   {{name}} {{a.b.c}}
 *   {{#if flag}} … {{else}} … {{/if}}
 *   {{#unless flag}} … {{/unless}}
 *   {{#each items}} … {{this}} {{name}} {{@index}} … {{/each}}
 */
export function render(template: string, data: TemplateData): string {
  return evaluate(parse(template), data);
}

// ── AST ──────────────────────────────────────────────────────────────────────

type Node =
  | { type: 'text'; value: string }
  | { type: 'var'; path: string }
  | { type: 'if'; path: string; negate: boolean; consequent: Node[]; alternate: Node[] }
  | { type: 'each'; path: string; body: Node[] };

type Tag =
  | { kind: 'var'; path: string }
  | { kind: 'open'; block: 'if' | 'unless' | 'each'; path: string }
  | { kind: 'else' }
  | { kind: 'close'; block: 'if' | 'unless' | 'each' };

const TAG = /\{\{\s*([#/]?)\s*([\w.$@-]+)(?:\s+([\w.$@-]+))?\s*\}\}/g;

function classify(prefix: string, first: string, second: string | undefined): Tag {
  if (prefix === '#') {
    if (first !== 'if' && first !== 'unless' && first !== 'each') {
      throw new GeneratorError(
        'TEMPLATE_ERROR',
        `Unknown block helper {{#${first}}}.`,
        'Only #if, #unless and #each are supported.',
      );
    }
    if (!second) {
      throw new GeneratorError('TEMPLATE_ERROR', `{{#${first}}} needs an argument, e.g. {{#${first} items}}.`);
    }
    return { kind: 'open', block: first, path: second };
  }
  if (prefix === '/') {
    if (first !== 'if' && first !== 'unless' && first !== 'each') {
      throw new GeneratorError('TEMPLATE_ERROR', `Unknown closing tag {{/${first}}}.`);
    }
    return { kind: 'close', block: first };
  }
  if (first === 'else') return { kind: 'else' };
  return { kind: 'var', path: first };
}

function parse(template: string): Node[] {
  const tags: Array<{ tag: Tag; start: number; end: number }> = [];
  TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG.exec(template)) !== null) {
    tags.push({
      tag: classify(match[1] ?? '', match[2] ?? '', match[3]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  let cursor = 0; // index into `template`
  let position = 0; // index into `tags`

  /** Parses nodes until the close tag for `until`, or end of input. */
  const parseNodes = (until: 'if' | 'unless' | 'each' | 'else' | null): Node[] => {
    const nodes: Node[] = [];

    while (position < tags.length) {
      const { tag, start, end } = tags[position] as (typeof tags)[number];

      if (start > cursor) nodes.push({ type: 'text', value: template.slice(cursor, start) });

      if (tag.kind === 'close') {
        if (until === null) {
          throw new GeneratorError('TEMPLATE_ERROR', `Unexpected {{/${tag.block}}} with no matching open tag.`);
        }
        // `else` blocks are terminated by the enclosing block's close tag,
        // which the caller consumes — so leave the cursor before it.
        cursor = start;
        return nodes;
      }

      if (tag.kind === 'else') {
        if (until !== 'if' && until !== 'unless') {
          throw new GeneratorError('TEMPLATE_ERROR', '{{else}} outside of an {{#if}} block.');
        }
        cursor = start;
        return nodes;
      }

      position += 1;
      cursor = end;

      if (tag.kind === 'var') {
        nodes.push({ type: 'var', path: tag.path });
        continue;
      }

      // An opening block tag.
      if (tag.block === 'each') {
        const body = parseNodes('each');
        consumeClose('each');
        nodes.push({ type: 'each', path: tag.path, body });
        continue;
      }

      const consequent = parseNodes(tag.block);
      let alternate: Node[] = [];
      if (peekIsElse()) {
        position += 1;
        cursor = (tags[position - 1] as (typeof tags)[number]).end;
        alternate = parseNodes(tag.block);
      }
      consumeClose(tag.block);
      nodes.push({ type: 'if', path: tag.path, negate: tag.block === 'unless', consequent, alternate });
    }

    if (until !== null) {
      throw new GeneratorError(
        'TEMPLATE_ERROR',
        `Unclosed {{#${until}}} block.`,
        `Add the matching {{/${until}}}.`,
      );
    }
    if (cursor < template.length) nodes.push({ type: 'text', value: template.slice(cursor) });
    return nodes;
  };

  const peekIsElse = (): boolean => tags[position]?.tag.kind === 'else';

  const consumeClose = (block: 'if' | 'unless' | 'each'): void => {
    const next = tags[position];
    if (!next || next.tag.kind !== 'close' || next.tag.block !== block) {
      throw new GeneratorError(
        'TEMPLATE_ERROR',
        `Unclosed {{#${block}}} block.`,
        `Add the matching {{/${block}}}.`,
      );
    }
    position += 1;
    cursor = next.end;
  };

  return parseNodes(null);
}

// ── Evaluation ───────────────────────────────────────────────────────────────

function evaluate(nodes: Node[], data: TemplateData): string {
  let output = '';

  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        output += node.value;
        break;
      case 'var':
        output += stringify(lookup(data, node.path));
        break;
      case 'if': {
        const truthy = isTruthy(lookup(data, node.path)) !== node.negate;
        output += evaluate(truthy ? node.consequent : node.alternate, data);
        break;
      }
      case 'each': {
        const value = lookup(data, node.path);
        const items = Array.isArray(value) ? value : [];
        items.forEach((item, index) => {
          output += evaluate(node.body, {
            ...data,
            ...(isPlainObject(item) ? item : {}),
            this: item,
            '@index': index,
            '@first': index === 0,
            '@last': index === items.length - 1,
          });
        });
        break;
      }
    }
  }

  return output;
}

function isPlainObject(value: unknown): value is TemplateData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

/** Resolves a dotted path against the data scope. */
function lookup(data: TemplateData, expression: string): unknown {
  if (expression in data) return data[expression];

  let current: unknown = data;
  for (const segment of expression.split('.')) {
    if (current === null || current === undefined) return undefined;
    current = (current as TemplateData)[segment];
  }
  return current;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(stringify).join(', ');
  return String(value);
}
