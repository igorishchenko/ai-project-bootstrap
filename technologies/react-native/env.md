# React Native environment

React Native does not read `.env` on its own — values are injected at build time
by whatever config layer the project uses, which means **anything exposed to the
app ships inside the bundle and can be extracted from an installed app**.

Never put a secret in a client-visible variable. Server keys, service-role keys
and API secrets belong on a server or in CI secrets.

The concrete variable names depend on the platform tooling, so they are declared
by that module rather than here.
