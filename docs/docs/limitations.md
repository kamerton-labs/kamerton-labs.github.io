# Limitations and status

Version 0.2.0, early. Below: what works, where it was tried and what is missing. We do not promise dates.

## What works

Covered by unit tests:

- the description format with validation and JSON Schema;
- the rule library: every rule file is validated with Prometheus' own parser, and the requests-stopped, "no data" and "no ready pods" rules are also tested with Prometheus' engine;
- generation of rules, a basic dashboard, Alertmanager routes with the inhibit rules for grouping by cause, and runbook stubs;
- the controller with status conditions;
- discovery, backtest and probable-source search;
- the follow-up message, the incident history and the noise statistics, against fake Kubernetes, Prometheus, Loki and Telegram APIs;
- the UI: systems list, canvas, rules with readable cards, backtest and custom rules, YAML mode, runbook pages, channels, status page;
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

A clean installation of 0.2.0 on an Ubuntu 24.04 server, k3s inside Docker, following [On a Linux server](./linux):

- the chart installs from the published image, all pods run within a minute;
- the demo description produces its 195 rules;
- with payment scaled to zero the alert about the cause arrives, the alerts of its callers are muted, the evidence names the scaling, and the incident lands in the history.

Grouping by cause, the follow-up, the incident history, the "Useful" and "Noise" buttons and the noise statistics are new in 0.2.0. Each was tried on these two clusters and nowhere else yet.

Found on that installation and not fixed in 0.2.0:

- a description that names a Telegram or email receiver before its Secret exists gets its whole Alertmanager configuration rejected by the Prometheus Operator: nothing is sent and nothing is muted until the channel is connected or the receiver removed;
- right after the demo shop starts, a few error alerts fire for about three minutes while its services come up;
- on a workload younger than the incident, the evidence lists its first rollout as "new version".

## Not done yet, and known limits

- **The first day.** Rules that compare with normal need history: an hour for most, a day for the "no data" rules and for a complete stop in "requests stopped". If Prometheus keeps less than about a day of data, those never fire. A service that only works in the daytime is not checked in the hour after its usual start and the hour before its usual end.
- **Counted twice with auto-instrumentation.** The agent misses some SDKs. On the test cluster nginx with the OpenTelemetry module, a C++ service and a Python grpcio service were counted twice. Error shares stay right, request rates do not. See [Configuration](./configuration#services-without-opentelemetry).
- **Auto-instrumentation** was tried on one single-node k3s cluster only, and its mode without a privileged container (`privileged=false`) not at all.
- **Incident history** keeps at most 300 incidents of the last 180 days. The evidence shown in the UI is kept in the memory of the replica that got Alertmanager's webhook: after a restart, or from another replica, an incident shows none until its next follow-up.
- **The follow-up** goes only through Kamerton's own bot and mail server, only for descriptions in Kamerton's namespace, and only in a cluster. Email gets no "incident over" message, because replies to email do not come back.
- One shared user, no roles or per-user audit.
- One cluster per installation. Several clusters are not supported.
- No long false-alert run yet. A 72-hour run on real traffic is planned.
- No chart repository yet. The chart is installed from a clone of the repository.
- No pruning. An object a system stops generating (for example its AlertmanagerConfig after the last receiver is removed) stays until the system itself is deleted. Deleting a system removes all its objects.
- Email is verified only against a test SMTP server, not a real mail provider.
- Your own Prometheus needs the Prometheus Operator. Pushing to Prometheus or Grafana HTTP APIs is not implemented.
- Two languages: the UI and notifications are available in English and Russian, no others.
- Dashboards are basic.
- Channels and finding installed programs need a cluster. They cannot be set up when running locally.

## Following changes

[CHANGELOG.md](https://github.com/kamerton-labs/kamerton/blob/main/CHANGELOG.md) in the repository.
