# Incidents

When `payment` goes down, `checkout` starts failing, then `frontend`, then everything that calls them. Without help that is ten messages about one problem. Kamerton knows the `dependsOn` graph from the description and uses it three ways:

- it mutes the alerts that are only consequences, so the alert about the cause is the one that arrives;
- after the alert it sends one short message with what it found about the cause;
- it keeps a history of incidents with what people wrote about them, and brings it back the next time.

All three are new in 0.2.0 and on by default. They are covered by unit tests but have had little time on a real cluster. See [Limitations and status](./limitations).

## Muting by cause

The AlertmanagerConfig that Kamerton generates for a system carries inhibit rules built from `dependsOn`:

- While a service has an error, latency, "requests stopped" or "no ready pods" alert, the error, latency, "requests stopped" and SLO burn-rate alerts of the services that call it directly are muted.
- A muted alert still mutes its own callers, so a whole chain collapses to the cause.
- A warning mutes only warnings. A critical alert mutes both.
- SLO alerts are muted but never mute others: a burning budget says nothing about the services a caller depends on.
- Memory, CPU, restart, out-of-memory, queue, "no data" and custom alerts are never muted this way. Neither are the alerts of the failed service itself.
- Services in a dependency cycle do not mute each other.

For `payment` in the demo the generated rule looks like this (labels shortened):

```text
source: service="payment", alertname=~"KamertonErrorRateHigh|...|KamertonRequestsStopped|KamertonNoReadyPods",
        kamerton_starved!="true", severity="critical"
target: service=~"checkout",
        alertname=~"KamertonErrorRateHigh|...|KamertonRequestsStopped|KamertonSLOBurnRateFast|KamertonSLOBurnRateSlow"
```

"No ready pods" waits only 30 seconds, so when a service is scaled to zero or all its pods crash, its alert usually fires before the errors of its callers.

### Starved services

A failure also takes traffic away from what the failed service calls or feeds through a queue. With `payment` down, `checkout` places no orders, so `email` gets no calls and the consumers of the `orders` topic get no messages. Their "no data" and "requests stopped" alerts would fire on their own.

Such an alert gets the label `kamerton_starved="true"` while an alert of a service that feeds it fires, and is muted by the same inhibit rules. That happens only when the starved service has no error, latency or "no ready pods" alert of its own, and only when the feeder's failure is not the starved service's doing. A service that cannot be reached, whose callers fail because of it, is still the cause. For a queue, the consumers are the services named in its `queue.consumerGroups`.

### Turning it off

```yaml
spec:
  notifications:
    groupByCause: false   # every alert is sent on its own
```

The system-wide "no data" alert mutes the per-service ones either way.

Grouping needs the Prometheus Operator to keep Kamerton's matchers as they are: `alertmanagerConfigMatcherStrategy: None`. The bundled chart sets it. With your own operator, see [Programs you already run](./existing-programs).

## The follow-up message

Alertmanager still sends the alert straight to Telegram and email, so it arrives even when Kamerton is down. It also calls Kamerton's webhook, `POST /api/v1/hooks/alertmanager`. About 45 seconds later, when the callers' alerts have had time to fire, Kamerton sends one short message to the same chats and addresses.

This one comes from the product's tests:

```text
🔎 Probable cause · shop (prod)
checkout: probable cause is payment (payment: Requests stopped arriving since 09:18 UTC+5).
Also affected: frontend, frontend-proxy.
What changed in payment in the last 30 min: new version at 09:14 UTC+5 (v1.4.2 -> v1.4.3); container payment restarted 3 times (OOMKilled, exit code 137), keeps crashing (CrashLoopBackOff); 1 of 2 pods not ready; warning BackOff: Back-off restarting failed container.
Most errors: operation oteldemo.PaymentService/Charge (42 failed calls in 30 min).
Log: “card declined: <upstream> timeout”
Failing traces in Grafana
```

In Telegram the last line is a link and the names are bold. By email the subject is `Probable cause: shop / payment`.

### What it can contain

Each part appears only when something was found.

| Line | Where it comes from |
| --- | --- |
| Probable cause | The `dependsOn` graph and the alerts that fire now. |
| Also affected | Services whose alerts were muted because of this cause, starved ones included. |
| What changed in the last 30 min | The Kubernetes API, for the service's `workload`: a new ReplicaSet with the old and new image tags, scaling, restarts with the reason and exit code, pods not ready or none at all, Warning events. |
| Most errors | Span metrics in the system's Prometheus, the operation with most failed calls. |
| Log | An error line from the system's Loki, shortened to 300 characters. It is not scrubbed. |
| Failing traces in Grafana | A Grafana Explore link to Tempo. Needs `incidents.grafanaExternalURL`. |

When a service is scaled to zero, the workload line reads like this:

```text
What changed in payment in the last 30 min: payment scaled from 1 to 0 replicas at 16:50 UTC; no pods exist.
```

### When the caller's alert comes first

Sometimes the caller alerts before its dependency does. Then Kamerton looks at the direct dependencies of the alerting service at that moment: alerts Prometheus reports as pending, no ready pods, error rate, calls far below normal. It names what it sees:

```text
Alert: checkout (checkout: SLO error budget burns fast since 09:16 UTC+5).
Likely cause: payment, called by checkout (observed now: No ready pods; Requests stopped arriving (alert pending)). Its own alerts have not fired yet.
```

When the cause's own alert fires later, its follow-up says which earlier alert it explains:

```text
This explains the earlier alert about checkout and frontend (since 09:16 UTC+5).
```

### One per incident

An incident gets one follow-up. Repeats of the same alert from Alertmanager send nothing new. Sent follow-ups are remembered for a day in the ConfigMap `kamerton-followup-state`, so a restart or a second replica does not send them again.

If nothing useful is found yet, Kamerton tries again about 1 and 3 minutes later and on later notifications of the incident. Then it gives up and logs the reason at Info level as `follow-up not sent`.

### Limits

- The follow-up goes only through Kamerton's own bot and mail server, the ones set up on the Channels screen.
- Only descriptions in Kamerton's namespace get the webhook, and only in a cluster.
- A log line is quoted as the service wrote it. Whatever the service logs can end up in the chat.

## Incident history

Kamerton keeps a record of every incident: the system, the root services and their alerts, the affected services, start, end, duration and the evidence of the follow-up. An incident still going on is listed as open. The UI shows the history on the Alerts screen, in the "History" view.

### Notes: cause and what helped

People add two short notes to an incident: the cause, at most 200 characters, and what helped, at most 500. In the UI they are under "Add a note" on the incident.

In Telegram it is quicker. When an incident that had a follow-up in Telegram ends after lasting at least 2 minutes, the same chats get:

```text
✅ Incident over · shop (prod): payment (No ready pods), lasted 12 min.
What helped? Reply to this message, and Kamerton will remind you the next time.
```

A reply to that message becomes the "what helped" note. Kamerton puts 👍 on the reply, and a later reply replaces the note. Replies count only from chats that get the system's alerts through Kamerton's bot. Email gets no such message, because a reply to an email does not come back to Kamerton: write the note in the UI.

If the callers' alerts are still firing when the cause resolves, the message says so:

```text
Still firing after it: checkout (SLO error budget is burning). This is expected for a while after an outage.
```

Such alerts in the 35 minutes after the cause resolved count as the incident's aftermath, not as a new incident with a new follow-up. If they still fire after that, they become an incident of their own.

### The next time

When the same root service fails again, preferably with the same kind of alert, the follow-up ends with the last time:

```text
🕘 Happened before: 14:02 27.10 UTC+5, lasted 1 h 12 min.
Cause: payment pods OOMKilled after a release
What helped: rolled back to v1.4.2 and raised the memory limit
Times in the last 30 days: 4.
```

Without a cause note, the "Cause" line shows the cause Kamerton collected, for example `payment: No ready pods since 16:50 UTC`. A note alone is reason enough to send a follow-up, even when nothing else was found.

The runbook page of a service lists the last notes under "What helped before".

### What is kept

At most 300 incidents of the last 180 days, in the ConfigMap `kamerton-incident-history`, or in memory when Kamerton runs without a cluster. A record holds service and alert names, times, the evidence including the log line, the notes as written, and the chat and message IDs of the "incident over" messages, so that replies can be matched. No names or user IDs of people.

## Switches

| Where | Setting | What it does |
| --- | --- | --- |
| Description | `spec.notifications.groupByCause: false` | No muting by cause. |
| Description | `spec.notifications.evidenceFollowUp: false` | No follow-up for this system. The "incident over" message goes with it. |
| Description | `spec.notifications.askWhatHelped: false` | No "incident over" message. Notes can still be written in the UI. |
| Helm | `incidents.followUp.enabled=false` | No webhook in the generated routing at all. |
| Helm | `incidents.followUp.workloadRead=false` | Drops the cluster-wide read access to pods, events, ReplicaSets and StatefulSets. The follow-up then has no "what changed" line. |
| Helm | `incidents.grafanaExternalURL` | Grafana as people open it, for the trace link. Empty: no link. |

What the webhook and the extra read access mean for security: [Security](./security#incidents).

## In the alerts API

`GET /api/v1/alerts` and `GET /api/v1/systems/{id}/alerts` return `incidents` (root services, their alerts, affected services and their muted alerts), `muted`, and per alert `fingerprint`, `muted` and `incident`. Each incident carries the last `evidence`, the `previous` incident of the same root and its `historyId`.

The history itself is `GET /api/v1/incidents/history`, and a note is written with `PUT /api/v1/incidents/history/{id}/note`. State-changing requests need the `X-Requested-With` header, see [Security](./security#the-x-requested-with-header).
