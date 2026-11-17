# Rule library

Kamerton generates Prometheus alerting rules from the system description. Every rule file is parsed with Prometheus' own parser before it leaves the generator. Prometheus evaluates the rules every 15 seconds; a rule fires when its condition holds longer than its pending period (`for`).

## Common to all rules

Severity defaults to critical for critical services (`critical: true`) and to warning for the others. Any rule accepts an explicit `severity: critical` or `severity: warning`.

Error rules do not page on a single failure in an idle service; they need a minimum rate of calls. Latency rules need only 3 calls in the window, so rare operations (two orders a minute) are still checked.

Any rule can be switched off with its toggle in the rule list or with a field in the description; the fields are listed below. Every rule can carry [its own notification text](./notifications#your-own-text). A rule card shows how many times the rule would have fired on Prometheus data over a day, 3 or 7 days.

The defaults below apply when neither `defaults` nor the service sets a value.

## Requests

### Errors

`KamertonErrorRateHigh`. The share of failed calls is above the threshold.

| | |
| --- | --- |
| Defaults | threshold 5% (`threshold: 0.05`), at least 0.05 calls per second, holds 1 min |
| Fields | `errorRate.threshold`, `minRequestsPerSecond`, `for`, `severity` |
| Switch off | `errorRate.enabled: false` |

### Errors per operation

`KamertonOperationErrorRateHigh`. The same for every operation separately, so a failure of one rare operation is not hidden by healthy traffic of others. Needs at least 3 failed calls of the operation in the window. On by default.

Switch off: `errorRate.perOperation: false`. Operations with their own policy (`operations`) are checked by their own rule.

### Latency

`KamertonLatencyHigh`. The latency quantile is above the threshold, with at least 3 calls in the window.

| | |
| --- | --- |
| Defaults | quantile 0.95, threshold 1000 ms, holds 2 min |
| Fields | `latency.quantile`, `thresholdMs`, `for`, `severity` |
| Switch off | `latency.enabled: false` |

### Latency per operation

`KamertonOperationLatencyHigh`. An operation's quantile is above the threshold (at least 3 calls), for operations that were under it during the previous hour. Holds 30 seconds. On by default.

Switch off: `latency.perOperation: false`.

### Slower than normal

`KamertonLatencyAboveNormal`. The service quantile is 5 times its value over the previous hour (ending 10 minutes ago) and above 100 ms. Holds 1 minute. No team threshold is needed: this catches, for example, a cache that stopped working and took responses from 7 to 300 ms.

Factor: `latency.aboveNormalFactor`. Switch off: `latency.aboveNormalFactor: 0`.

### Requests stopped arriving

`KamertonRequestsStopped`. A service nobody can reach writes no errors — it simply stops receiving calls. The rule compares the current rate of incoming calls with the normal one: the average over the last day, counted only where data exists.

| | |
| --- | --- |
| Fires | at or below 10% of normal (`threshold: 0.1`), when normal is above 0.02 calls per second (about one a minute), holds 2 min |
| Stays silent | with less than an hour of history; while data is missing for most services of the system at once — then the telemetry pipeline has stopped, not the service |
| Default | on for critical `http` and `grpc` services; queues and databases get it only when set on the service |
| Fields | `trafficDrop.enabled`, `threshold`, `minRequestsPerSecond`, `for`, `severity` |

## Pod resources

### Memory and CPU above a threshold

`KamertonMemoryHigh`, `KamertonCPUHigh`. Active when a threshold is set explicitly: `saturation.memory` (for example `512Mi`) or `saturation.cpuCores` (for example `0.5`). Hold 2 minutes by default. An explicit threshold replaces the "near the limit" and "above normal" rules below.

### Restarts

`KamertonPodRestarting`. A container restarts more than `saturation.maxRestartsPerHour` times an hour (default 3).

Switch off: `saturation.restartsEnabled: false`.

### Memory near the limit

`KamertonMemoryNearLimit`. No memory threshold set: the pod's memory is above 95% of its limit and the trend over the last hour reaches the limit within 30 minutes. All containers of the pod must have a limit.

Share: `saturation.memoryLimitShare`. Switch off: `saturation.memoryLimitShare: 0`.

### CPU near the limit

`KamertonCPUNearLimit`. No CPU threshold set: above 90% of the pod's CPU limit.

Share: `saturation.cpuLimitShare`. Switch off: `saturation.cpuLimitShare: 0`.

### CPU far above normal

`KamertonCPUAboveNormal`. No CPU threshold set: the pod uses more than 0.5 cores and 3 times its normal CPU (the average over the previous hour, ending 10 minutes ago). Useful for pods without a CPU limit.

Factor: `saturation.cpuAboveNormalFactor`. Switch off: `saturation.cpuAboveNormalFactor: 0`.

### Out of memory (OOMKilled)

`KamertonOOMKilled`. The container's last termination was OOMKilled and it restarted in the last 10 minutes. Fires at once.

Switch off: `saturation.oomKilledEnabled: false`.

All resource rules switch off together with `saturation.enabled: false`.

## Queues

### Queue lag

`KamertonQueueLagHigh`. For `queue` services: unprocessed messages pile up in the topic, the consumer group lag is above `queue.maxLag`. Holds 2 minutes by default.

### Nobody reads the queue

`KamertonQueueConsumerStopped`. A consumer group of the topic has had no members for 1 minute, or its lag stayed above zero for 3 minutes while its committed offset did not move. Works at any traffic, needs no threshold. Holds 1 minute, same severity as the lag rule. On by default.

Switch off: `queue.consumerStoppedEnabled: false`. Metrics: `telemetry.queues.membersMetric` and `offsetMetric`.

## Availability objective (SLO)

`KamertonSLOBurnRateFast`, `KamertonSLOBurnRateSlow`. The error budget is being spent too fast. Multiwindow, multi-burn-rate alerts after the Google SRE Workbook; the factors are derived from the SLO window.

```yaml
slo:
  objective: 99.5   # share of successful calls, %
  window: 30d       # default 30d
```

Created only when the service has an `slo`.

## Your own rules

Any condition on any Prometheus metric: assembled from parts (metric, function, aggregation, comparison) or written in PromQL. Create them on the Rules tab or in the service's `customRules`. See [Describe a system](./describe-system#your-own-rules).

## Rules with a "normal"

Rules that compare a service with its normal behaviour stay silent until there is enough history: a new service, the first hour after a gap in the data.
