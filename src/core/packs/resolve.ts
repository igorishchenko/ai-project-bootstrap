import type { PackRule, RulePack } from './packTypes.js';

/**
 * How a pack layers over the built-in rules.
 *
 * The whole design lives here, and it is deliberately a set of **pure
 * functions over content strings** rather than anything the builders know
 * about. A builder asks "what should this module's rule body be" and gets a
 * string back; whether a pack touched it is not a question any builder asks.
 *
 * That is what keeps the invariant intact — no file under `src/` names a
 * technology, and now no *builder* names a pack either.
 *
 * ## Why fingerprints keep working
 *
 * `configBuilder` fingerprints whatever ended up in the virtual filesystem, so
 * pack-derived content is fingerprinted exactly like everything else with no
 * special case. `check` recomputes the same output from the same inputs and
 * finds it identical — **provided the pack is still resolvable**. That proviso
 * is the real hazard, and it is handled where packs are loaded, not here: a
 * pinned pack that cannot be found is an error, never a quiet generation
 * without the organisation's standards. Generating without them would produce
 * files that differ from the fingerprints and report the entire project as
 * drifted, which is precisely the noise that would teach people to ignore
 * `check`.
 */

/** A built-in rule after a pack has had its say. */
export interface ResolvedRuleBody {
  body: string;
  /** Packs that extended this rule, in pack order. */
  extendedBy: string[];
  /** The pack that replaced it outright, if any. */
  replacedBy?: string;
}

export interface PackAddition {
  /** `<packSlug>-<ruleId>`, so two packs cannot collide on a filename. */
  id: string;
  name: string;
  description: string;
  globs: string[] | undefined;
  content: string;
  packSlug: string;
}

/** Rules a pack adds, filtered to what this stack actually selected. */
export function packAdditions(
  packs: readonly RulePack[],
  selectedModuleIds: ReadonlySet<string>,
): PackAddition[] {
  const additions: PackAddition[] = [];

  for (const pack of packs) {
    for (const rule of pack.rules) {
      if (!rule.appliesTo) continue;
      // `*` is every project. Anything else is a module id, and a rule scoped
      // to a module this project did not select simply does not appear — a
      // pack is written once for a fleet with more than one stack in it.
      const applies = rule.appliesTo.some(
        (target) => target === '*' || selectedModuleIds.has(target),
      );
      if (!applies) continue;

      additions.push({
        id: `${pack.id}-${rule.id}`,
        name: rule.name,
        description: rule.description ?? `${pack.name}: ${rule.name}`,
        globs: rule.globs,
        content: rule.content,
        packSlug: pack.id,
      });
    }
  }

  return additions;
}

function rulesTargeting(
  packs: readonly RulePack[],
  moduleId: string,
  field: 'extends' | 'replaces',
): Array<{ pack: RulePack; rule: PackRule }> {
  const hits: Array<{ pack: RulePack; rule: PackRule }> = [];
  for (const pack of packs) {
    for (const rule of pack.rules) {
      if (rule[field] === moduleId) hits.push({ pack, rule });
    }
  }
  return hits;
}

/**
 * One built-in rule's body, with every pack's edits applied.
 *
 * **Extend appends; replace substitutes.** When both target the same module,
 * replace wins and the extensions land below the replacement — the org has
 * said "not ours, ours instead", and an extension is still an addition to
 * whatever is there. Two packs replacing the same rule is resolved by pack
 * order, and both are named in the result so a caller can say so out loud
 * rather than leaving somebody to wonder why our section vanished.
 */
export function resolveRuleBody(
  moduleId: string,
  builtInBody: string,
  packs: readonly RulePack[],
): ResolvedRuleBody {
  const replacements = rulesTargeting(packs, moduleId, 'replaces');
  const extensions = rulesTargeting(packs, moduleId, 'extends');

  if (replacements.length === 0 && extensions.length === 0) {
    return { body: builtInBody, extendedBy: [] };
  }

  const last = replacements[replacements.length - 1];
  const base = last ? last.rule.content.trim() : builtInBody.trim();

  const parts = [base, ...extensions.map(({ rule }) => rule.content.trim())];

  return {
    body: parts.join('\n\n'),
    extendedBy: extensions.map(({ pack }) => pack.id),
    ...(last ? { replacedBy: last.pack.id } : {}),
  };
}

/**
 * Every built-in rule a pack replaced, for reporting.
 *
 * `check` surfaces this so nobody is confused about why an advisory about our
 * `nextjs` rule did not seem to apply — their pack replaced it, on purpose,
 * and that is a fact worth stating rather than discovering.
 */
export function replacedModuleIds(packs: readonly RulePack[]): Map<string, string> {
  const replaced = new Map<string, string>();
  for (const pack of packs) {
    for (const rule of pack.rules) {
      if (rule.replaces) replaced.set(rule.replaces, pack.id);
    }
  }
  return replaced;
}
