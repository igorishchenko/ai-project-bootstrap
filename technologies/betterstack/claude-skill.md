# Better Stack

Monitoring and logs for {{projectName}}.

## Monitoring is not error reporting

The crash reporter sees errors the application managed to report. Monitoring
catches the failures where nothing could report anything — the server is
unreachable, the certificate expired, the database is down.

So a health endpoint must actually check its dependencies and return non-200
when they fail. One that returns 200 unconditionally tells you the web server is
running, which is almost never the thing that broke.

## Never log secrets or personal data

No tokens, passwords, session ids, API keys, or whole request bodies that might
contain them. No email addresses, names or message content.

Logs are retained for months, replicated, and readable by everyone with
dashboard access. A token in a log line is a leaked credential that outlives the
incident that produced it — and "we'll scrub it later" rarely happens.

If asked to log a full request or response to debug something, log an
identifier and the specific fields needed instead.

## Structured, not interpolated

```ts
logger.info('Subscription renewed', { userId, plan });
```

Not `logger.info(\`Renewed ${plan} for ${userId}\`)`. Fields are searchable and
aggregatable; a formatted sentence is neither.

## Alert on symptoms, not events

Alert when users are affected: service down, error rate elevated, latency
doubled. Do not alert on individual errors — that produces fatigue, and fatigue
is why a real page gets dismissed along with the noise.

Every alert needs an action. If nobody would do anything at 3am, it is a
dashboard.

## Flush before exit

Buffered logs die with the process, so the logs explaining a crash are exactly
the ones most likely to be lost. Flush in shutdown handlers.
