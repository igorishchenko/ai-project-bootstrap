# Supabase security checklist

Work through this before any release that touches the schema or auth.

## Row Level Security

- [ ] RLS enabled on **every** table, including new ones from this release.
- [ ] Each table has explicit policies for select, insert, update and delete —
      or deliberately has none, denying that operation.
- [ ] Policies verified while signed in as a *different* user, not as the owner.
      Testing only as the row's owner proves nothing.
- [ ] No policy uses a value the client controls in place of `auth.uid()`.

## Keys

- [ ] `service_role` key is absent from the app, from every `{{envPrefix}}*`
      variable, and from the repository history.
- [ ] Production and development use separate projects with separate keys.
- [ ] CI reads keys from secrets, not from a committed file.

## Schema

- [ ] Every change in this release exists as a migration file in git.
- [ ] Nothing was changed through the dashboard.
- [ ] Migrations run cleanly against a copy of production data.
- [ ] Migrations are compatible with the app version currently deployed, so a
      rollback does not corrupt data.
- [ ] Generated types regenerated and committed.

## Data

- [ ] Automatic backups enabled.
- [ ] A restore has actually been rehearsed — an untested backup is a guess.
- [ ] Indexes exist on every column used in a filter or join.
- [ ] Personal data is only in tables whose policies restrict it to its owner.

## Auth

- [ ] Redirect URLs configured for production, including {{#if has.mobile}}deep links{{/if}}{{#unless has.mobile}}preview deployments{{/unless}}.
- [ ] Email templates reviewed and sent from a verified domain.
- [ ] Session refresh works after the access token expires.
