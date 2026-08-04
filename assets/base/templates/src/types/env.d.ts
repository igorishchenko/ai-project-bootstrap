/**
 * Environment variables this project reads.
 *
 * Generated from every selected module's `env.md`, so this list and
 * `.env.example` cannot drift apart. Add a variable by declaring it in the
 * owning module, not by editing this file.
 *
 * Every value is typed optional on purpose: `.env` is not guaranteed to be
 * complete at runtime, and pretending otherwise pushes the failure somewhere
 * less obvious. Validate the ones you require at startup.
 */
declare namespace NodeJS {
  interface ProcessEnv {
{{#each envKeys}}    {{this}}?: string;
{{/each}}  }
}
