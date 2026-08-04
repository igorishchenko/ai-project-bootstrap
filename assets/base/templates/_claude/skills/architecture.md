# Architecture

How to add code to {{projectName}} without fighting the structure.

## The layering

```
UI  →  hooks  →  services  →  clients / SDKs
```

Each arrow points at something the layer is allowed to import. Nothing points
back. A service importing a component is a bug even when it compiles.

## Adding a feature

1. **Create the feature folder.** Screens, components, hooks and services for
   that feature live together. Someone deleting the feature should be able to
   delete one folder.
2. **Put I/O behind a service.** Network calls, storage, SDK calls. The screen
   asks the service for data; it does not know where the data comes from.
3. **Wrap the SDK.** If the feature introduces a third-party SDK, initialise it
   in one client module and expose only what this project needs.
4. **Test the logic, not the plumbing** — see the testing skill.
5. **Update the docs** if you introduced a flow, a variable or an SDK.

## Where a thing belongs

| Kind of code | Location |
| --- | --- |
| Screen, component | Feature folder |
| Stateful reusable logic | `hooks/` in the feature |
| Business rules, data access | `services/` |
| SDK initialisation | One client module per SDK |
| Shared primitive | Shared location, after the third use |

## State

Server state and client state are different problems. Fetched data belongs in a
cache with an invalidation rule; UI state belongs in the component that owns it.
Mixing them produces stale screens that are painful to debug.

Derive values rather than storing them twice. Any two fields that must stay in
agreement eventually will not.

## Signs you are going against the grain

- You need an import that points "upward" through the layers.
- A component imports a vendor SDK.
- Two modules import each other.
- You are adding a third parameter to a function to make it behave differently
  for one caller — that is a second function.

When you hit one of these, stop and say so. The structure is usually right, and
the exceptions are worth discussing rather than working around quietly.
