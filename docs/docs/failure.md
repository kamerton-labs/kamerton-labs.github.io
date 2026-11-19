# Looking into a failure

New in 0.3.0. The alert says which service broke. The next question is why, and it usually takes three screens: the system, the service, one request. All three live in Kamerton's own UI. Grafana gets five generated dashboards for the digging that comes after; see [the end of this page](#grafana).

The screenshots below are from a real install of 0.3.0 next to the demo shop, a few minutes after it started. No fault flag was on. Checkout began answering in a minute instead of a second: its write of each order to Kafka hung, and the proxy in front of it gave up after 15 seconds.

## The system now

A system opens on **Now**. At the top is one sentence: where the failure is, what is wrong, since when, and which services suffer from it. With nothing firing it reads "All quiet" and the number of services.

<Shot name="now" alt="Now screen of otel-demo: Failure in checkout, requests are too slow, p95 15000 ms; checkout and payment availability bars; the map with checkout marked as the source" />

Under it, one bar per availability objective of the description: availability now and how much of the error budget is left.

The map is the canvas of the description with live numbers on it. Each card shows requests per second, p95, and the share of errors when there are any. The source of a failure is marked red with the alert's title. A service that fails only because something it calls failed reads "because of payment", and the way from it to the source is lit. Muted alerts are not shown here as problems of their own; that is the point of `dependsOn`.

An arrow turns red, with "8% failing" on it, when more than 1% of the calls between the two services fail. The numbers come from Tempo, which counts calls between services from the traces it receives (its service graph). Click an arrow for the last hour of those calls: how many, how many failed, p95, and the failed calls themselves, each opening its request.

A write to a queue is counted by Tempo as a call to the broker. For a queue the arrow points you to the queue's own page, where writes, reads and lag are.

## A service

Click a service, or "Look into checkout" next to the sentence at the top.

<Shot name="service" alt="checkout page: source of the failure, requests are too slow, what changed in the pods, then charts of errors, latency p95, requests, memory against its limit and CPU" />

The first line repeats what is wrong. Then **what changed in the pods in the last 30 minutes**: rollouts with the old and new image tag, scaling, restarts with their count, pods that are not ready. A failure that starts a minute after a rollout is usually the rollout. Kamerton reads this from the Kubernetes API: in a cluster with its own service account, locally with the kubeconfig next to it. Without either, the block says it could not read the pods.

The charts: errors, latency p50/p95/p99, requests, queue lag for a queue, memory against the pod limit, CPU. Each has a dashed line for its usual level: the median of the day before. On a fresh install there is no day before, so the line appears on the second day. An empty error chart collapses to "not one error in the range". Ranges go from 15 minutes to 7 days.

Click any chart, and the requests of those minutes are listed below it.

<Shot name="service-requests" alt="The lower half of the checkout page: requests of the range with the Slowest tab open, every PlaceOrder taking close to a minute; the operations table and the services checkout calls" />

**Failed** lists requests that ended with an error. **Slowest** asks Tempo for up to 100 requests slower than the median of the range and keeps the 20 slowest. Next to the list, the service's operations with their rate, errors and p95, and the services it calls and is called by. Each of those opens its own page.

## One request

A request opens on its steps, as a waterfall, with the step that brought you here picked.

<Shot name="request" alt="A checkout request of 62 seconds: the waterfall shows the publish orders step of checkout taking almost all of it; the step's attributes on the right; logs of the request below" caption="Where it broke is the proxy: it gave up after 15 seconds and answered 504. Why is in the bars under it: checkout went on waiting for Kafka for the whole minute." />

If the request failed, the title says where it broke: the failed step with no failed step under it. A proxy that returns 504 because checkout returned an error because payment did is a failure in payment, and the page says payment.

Steps shorter than 5% of the request are folded away, unless they are on the way to the failure. "Show small steps" brings them back. On the right, the picked step: its service and kind, the status, exceptions with their stack, and the attributes worth reading first (status codes, route, the queue's name, the database statement). The rest are one click away.

Below, the log lines every service wrote for this request, found in Loki by its `trace_id`, oldest first. A line that carries a span ID picks its step when clicked, and "selected step only" narrows the list to the picked step.

The demo's load generator keeps one trace for a whole visit to the shop, many requests long. Such a trace is cut down to the one request the step belongs to, and the page says so.

## What it needs

Everything below comes with the chart. With your own programs, this is what each part of the screens reads:

- **Span metrics** in Prometheus (the Collector's spanmetrics connector): all numbers on the map and the charts.
- **Tempo**: the lists of requests and the request page. Without it the service page says single requests cannot be seen.
- **Tempo's service graph**, its metrics generator writing `traces_service_graph_*` to Prometheus: red arrows and the calls panel. The chart turns it on.
- **Loki** with the `trace_id` of each line as a label or structured metadata: logs of a request.
- **The Kubernetes API**: what changed in the pods, memory against the limit, restarts.

Tempo and Loki are read at the addresses of the system's set of programs, so a system on your own Tempo shows your own traces. See [Programs you already run](./existing-programs).

The chart keeps traces for a week and metrics for 15 days, each on a disk of its own, so a restart loses neither. Sizes are in [Configuration](./configuration#bundled-programs).

## Grafana

For each system Kamerton writes five dashboards, the same way it writes rules: from the description, applied as ConfigMaps that Grafana's sidecar picks up.

- **Overview**: alerts firing now, each service's numbers in one table, Tempo's map of calls.
- **Services**: requests, errors, latency p50/p95/p99, memory against the limit, CPU, one row per service.
- **Queues**: written and read per second and the lag of each consumer group, with the alert's threshold as a line.
- **Infrastructure**: nodes and pods.
- **SLO**: availability, error budget left, burn rate over 1 and 6 hours against the 14.4 line, latency, availability per hour.

Panels link to the failed traces of the service in Tempo and back to the service's page in Kamerton. In Grafana a trace opens the logs of all its services, and a log line with a `trace_id` opens its trace.

## API

The screens read these endpoints. They need the same login as the UI.

| Endpoint | What it returns |
| --- | --- |
| `GET /api/v1/systems/{id}/now` | the sentence, each service's state and numbers, incidents, the arrows, SLO budgets |
| `GET /api/v1/systems/{id}/services/{service}/series?range=1h` | the charts with their usual levels and limits, restarts, operations |
| `GET /api/v1/systems/{id}/services/{service}/requests` | failed (`kind=errors`) or slow (`kind=slow&over=<ms>`) requests of a window |
| `GET /api/v1/systems/{id}/services/{service}/changes` | what changed in the pods in the last 30 minutes |
| `GET /api/v1/systems/{id}/calls?from=&to=` | calls between two services over a range, and the failed ones |
| `GET /api/v1/systems/{id}/traces/{trace}` | one trace with its steps and its log lines |

## Limits

- The usual level needs a day of history; before that the charts have no dashed line.
- Slowest is a sample: the 20 slowest of 100 Tempo found above the median, not every slow request.
- "What changed" looks back 30 minutes and only at the service's own pods, not at its config or at what it depends on.
- Tried on the demo shop on a k3s test cluster and on one server install. See [Limitations and status](./limitations).
