# Phase 1 — AI Provider Breadth & Stack Presets

**Goal:** extend the tool's actual core differentiator — generating AI-agent-ready project setup — before building new commands on top of it.

## Features

### Multi-provider AI rules generation (`prompts/01-multi-provider-ai-rules.md`)

Today, `src/builders/assetBuilders.ts` emits rules for exactly two tools: Cursor (`.cursor/rules/*.mdc`) and Claude Code (`.claude/skills/*/SKILL.md`). ChatGPT's list names six more real, commonly-used AI coding tools that get nothing: GitHub Copilot, Gemini CLI, OpenAI Codex, Continue.dev, Cline, and Roo Code. Every one of the 31 technology modules already carries the source content (`cursor-rule.mdc`, `claude-skill.md`) these new builders need — this is a builder-layer extension, not a per-module content-authoring project, so it should scale to the existing module catalogue for free.

### Stack presets (`prompts/02-stack-presets.md`)

The wizard is fully manual today — every project answers all ~16 category questions from scratch. ChatGPT's example ("Startup MVP" = Expo + NativeWind + RevenueCat + Sentry + Posthog + Supabase, one click) is a real time-saver for the common case and a natural on-ramp for new users who don't know which of 31 modules to pick. This is additive config (`config/presets.json`) plus a wizard entry point — it doesn't touch the resolution/build engine.

## Ordering note

`01` before `02` isn't a hard dependency, but doing provider breadth first means presets can be demoed against the full provider set rather than just Cursor/Claude.

Prompts: [`../prompts/01-multi-provider-ai-rules.md`](../prompts/01-multi-provider-ai-rules.md), [`../prompts/02-stack-presets.md`](../prompts/02-stack-presets.md)
