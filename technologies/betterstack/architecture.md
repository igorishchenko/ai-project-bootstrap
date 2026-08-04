Monitoring watches from outside the system, which is what lets it catch failures
the system itself cannot report.

```mermaid
flowchart TD
  monitor["Better Stack monitor"] -->|GET /health| api["Your service"]
  api --> deps{"Dependencies healthy?"}
  deps -->|yes| ok["200"]
  deps -->|no| fail["503"]
  fail --> alert["Alert"]
  monitor -.->|no response at all| alert
  alert --> oncall["On-call escalation"]
  api --> logs["Structured logs"]
  logs --> search[("Log management")]
```

The dotted path is the one that matters. When the service is unreachable, an
in-process error reporter has nothing to send — only an external check notices.

The health endpoint therefore has to be honest: if it returns 200 without
testing the database, the monitor stays green through an outage.

### Alert routing

```mermaid
flowchart LR
  symptom["Symptom: down / error rate / latency"] --> consecutive{"N consecutive failures?"}
  consecutive -->|no| ignore["Ignore — blip"]
  consecutive -->|yes| page["Page on-call"]
  page --> escalate["Escalate if unacknowledged"]
```

Requiring consecutive failures is what separates an incident from a network
blip, and it is the difference between alerts people act on and alerts people
mute.
