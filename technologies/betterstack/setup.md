### Overview

Better Stack combines three things that usually live in separate tools: uptime
monitoring, log management, and on-call scheduling with escalation.

The distinction worth holding onto: **error reporting tells you something broke;
monitoring tells you whether the service is up at all.** A crash reporter sees
nothing when the server is unreachable or a certificate expired — those are
exactly the failures monitoring exists to catch.

### Uptime monitoring

1. **Monitors → Create monitor**, pointing at a health endpoint rather than the
   home page. A homepage can render from cache while the database is down.
2. Set the check interval and the number of failures before alerting — a single
   failed check is usually a network blip, not an incident.
3. Add a keyword or status-code assertion. A 200 returning an error page still
   counts as up otherwise.
4. Enable SSL and domain expiry monitoring. Both cause total outages and both
   are entirely preventable.

A useful health endpoint checks its dependencies — database reachable,
migrations applied — and returns non-200 when they fail. One that returns 200
unconditionally monitors nothing but the web server.

### Log management

```bash
npm install @logtail/node
```

```ts
import { Logtail } from '@logtail/node';

export const logger = new Logtail(process.env.BETTERSTACK_SOURCE_TOKEN!);

logger.info('Subscription renewed', { userId, plan });
```

Log structured objects, not interpolated strings — the fields are what make logs
searchable later.

**Never log personal data, tokens, passwords, session ids or request bodies that
might contain them.** Logs are retained, replicated and widely readable inside a
team; a token in a log line is a credential leak with a long tail.

### Alerting

Route alerts to an on-call schedule with escalation, not to a shared inbox that
nobody owns overnight.

Alert on symptoms users feel — the service is down, error rate is elevated,
latency has doubled — not on individual errors. Alerting on everything produces
fatigue, and fatigue means the one real page gets dismissed with the rest.

Every alert should be actionable. If nobody would do anything about it at 3am,
it is a dashboard, not an alert.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Monitor is up while users report failures | Checking the homepage, not a real health endpoint |
| Constant flapping alerts | Threshold too tight; require consecutive failures |
| Logs not appearing | Wrong source token, or the process exited before flushing |
| Logs lost on crash | Flush before exit; buffered logs die with the process |
| Nobody responded to a page | No escalation policy, or alerts sent to a shared inbox |

### Common mistakes

- **Monitoring the homepage.** It can be served from cache while everything else
  is broken.
- **A health check that always returns 200.** It monitors nothing.
- **Logging request bodies wholesale.** Tokens and personal data end up retained.
- **Alerting on every error.** Fatigue, then a missed real incident.
- **No SSL expiry monitoring.** A preventable, total, embarrassing outage.

### Production checklist

- [ ] Health endpoint checks real dependencies and fails when they fail.
- [ ] Monitor asserts on content or status, not merely reachability.
- [ ] SSL and domain expiry monitoring enabled.
- [ ] Alerts require consecutive failures.
- [ ] On-call schedule with an escalation policy.
- [ ] Structured logging, with no personal data, tokens or secrets.
- [ ] Log retention set deliberately.
- [ ] Logs flushed before process exit.

### Documentation

- [Better Stack](https://betterstack.com/docs)
- [Uptime monitoring](https://betterstack.com/docs/uptime/start/)
- [Logs](https://betterstack.com/docs/logs/start/)
- [On-call and escalation](https://betterstack.com/docs/uptime/on-call-calendar/)
