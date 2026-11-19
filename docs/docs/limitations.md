# Limitations and status

Version 0.3.1, early. Below: what works, where it was tried and what is missing. We do not promise dates.

## What works

Covered by unit tests:

- the description format with validation and JSON Schema;
- the rule library: every rule file is validated with Prometheus' own parser, and the requests-stopped, "no data" and "no ready pods" rules are also tested with Prometheus' engine;
- generation of rules, five Grafana dashboards per system, Alertmanager routes with the inhibit rules for grouping by cause, and runbook stubs;
- the controller with status conditions;
- discovery, backtest and probable-source search;
- the follow-up message, the incident history and the noise statistics, against fake Kubernetes, Prometheus, Loki and Telegram APIs;
- the UI: systems list, the Now screen with the live map, service and request pages, canvas, rules with readable cards, backtest and custom rules, YAML mode, runbook pages, channels, status page;
- saving descriptions from the UI: custom resource in a cluster, file locally;
- Telegram and email setup from the UI, Kamerton's own message templates;
- sets of programs and login.

End-to-end UI scenarios are run by the maintainers before each release.

## Where it was tried

A single-node k3s cluster with the OpenTelemetry Demo:

- the Helm chart installs and runs;
- the rule library fires on the demo's built-in fault scenarios;
- alerts are delivered to Telegram;
- sets of programs work, including finding installed programs and a second Prometheus;
- eBPF auto-instrumentation records the demo's services when it runs privileged.

A clean installation of 0.2.0, later upgraded to 0.2.1, on an Ubuntu 24.04 server, k3s inside Docker, following [On a Linux server](./linux):

- the chart installs from the published image, all pods run within a minute;
- the demo description produces its rules (196 since 0.3.1);
- with payment scaled to zero the alert about the cause arrives, the alerts of its callers are muted, the evidence names the scaling, and the incident lands in the history.

Grouping by cause, the follow-up, the incident history, the "Useful" and "Noise" buttons and the noise statistics are new in 0.2.0. Each was tried on these two clusters and nowhere else yet.

Found on that installation. Fixed in 0.2.1: a description that named a Telegram or email receiver before its Secret existed lost its whole Alertmanager configuration, so nothing was sent and nothing was muted. Now only that channel is left out, and the description's condition `ChannelsConnected` says which. Since 0.2.2 the UI says it too: on the system's card, on the Channels screen and in the getting-started block.

Also found there and changed in 0.2.3: the first rollout of a workload is now worded "first deployed", not "new version"; alerts that linger after an incident ends are shown as its tail, not as a new incident; the demo instructions wait for the shop to start before describing it.

Since 0.2.3 the lingering alerts are also kept out of the channels, by a short silence on exactly those alerts. Tried on the k3s test cluster only.

Upgrading to 0.2.3 with `helm upgrade --reuse-values` left the new pod crashing on an empty `incidents.tailMute`; the old pod kept serving. Fixed in 0.2.4, and these pages now use `--reset-then-reuse-values`.

A clean installation of 0.3.0 on the same kind of server, again following [On a Linux server](./linux) and [Demo shop](./demo), and left running to watch a day of it:

- `helm install` took 25 seconds, all pods ran 75 seconds later, the disks of Prometheus, Loki and Tempo were bound;
- the Now screen, the service page and the request page worked on the shop's live data. The screenshots in [Looking into a failure](./failure) are from it.

Found there in the first hours, all on a checkout that waited a minute to write to Kafka, and fixed in 0.3.1: a request longer than a minute was taken for a load generator's session and shown as one step of it; p95 never read above 15 s, where the spanmetrics connector's buckets ended; one latency rule flapped 22 times in 3 hours and sent a message each time, so every rule now keeps firing for 5 minutes after its condition drops out.

The wait itself is the demo's: its checkout confirms a write to Kafka only when the next order is written, so with no fault on, checkout takes 20-90 s and the proxy answers 504 to a few percent of orders. The demo description now sets thresholds above that wait, and says why. Before the change the server sent 13 messages in 75 minutes; in the first 20 minutes after it, none. A 72-hour run with no faults is under way.

## Not done yet, and known limits

- **The first day.** Rules that compare with normal need history: an hour for most, a day for the "no data" rules and for a complete stop in "requests stopped". If Prometheus keeps less than about a day of data, those never fire. A service that only works in the daytime is not checked in the hour after its usual start and the hour before its usual end.
- **Counted twice with auto-instrumentation.** The agent misses some SDKs. On the test cluster nginx with the OpenTelemetry module, a C++ service and a Python grpcio service were counted twice. Error shares stay right, request rates do not. See [Configuration](./configuration#services-without-opentelemetry).
- **Auto-instrumentation** was tried on one single-node k3s cluster only, and its mode without a privileged container (`privileged=false`) not at all.
- **Incident history** keeps at most 300 incidents of the last 180 days. The evidence shown in the UI is kept in the memory of the replica that got Alertmanager's webhook: after a restart, or from another replica, an incident shows none until its next follow-up.
- **The follow-up** goes only through Kamerton's own bot and mail server, only for descriptions in Kamerton's namespace, and only in a cluster. Email gets no "incident over" message, because replies to email do not come back.
- One shared user, no roles or per-user audit.
- One cluster per installation. Several clusters are not supported.
- No long false-alert run on real traffic yet. A day on the demo shop is the longest so far.
- No chart repository yet. The chart is installed from a clone of the repository.
- No pruning. An object a system stops generating (for example its AlertmanagerConfig after the last receiver is removed) stays until the system itself is deleted. Deleting a system removes all its objects.
- Email is verified only against a test SMTP server, not a real mail provider.
- Your own Prometheus needs the Prometheus Operator. Pushing to Prometheus or Grafana HTTP APIs is not implemented.
- Two languages: the UI and notifications are available in English and Russian, no others.
- Channels and finding installed programs need a cluster. They cannot be set up when running locally.
- The pages of a failure compare with the day before, so on the first day their charts have no usual level. The list of slowest requests is a sample of what Tempo returns.

## Following changes

[CHANGELOG.md](https://github.com/kamerton-labs/kamerton/blob/main/CHANGELOG.md) in the repository.
