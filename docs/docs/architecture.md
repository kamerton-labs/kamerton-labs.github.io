# Architecture

A short look inside. Packages, the API and design notes in depth: [ARCHITECTURE.md](https://github.com/kamerton-labs/kamerton/blob/main/docs/ARCHITECTURE.md) in the repository.

## One binary

Kamerton is one Go binary. It serves the HTTP API and the web UI (React, embedded in the binary) and runs a Kubernetes controller. The observability programs are installed alongside as Helm chart dependencies.

```
system description (SystemDescription resource or a file)
   │
   ├─► validate: JSON Schema and semantic checks
   ├─► generate: Prometheus rules, Grafana dashboard,
   │             Alertmanager routes, runbook stubs
   ├─► apply:    PrometheusRule, AlertmanagerConfig, ConfigMaps
   │             (server-side apply)
   └─► reconcile continuously: the controller watches SystemDescription
                               and writes status conditions
```

## The signal path

1. A service sends telemetry to the OpenTelemetry Collector.
2. The Collector routes it to storage: metrics to Prometheus, logs to Loki, traces to Tempo. From traces it derives call counts, errors and latency.
3. Prometheus evaluates the rules Kamerton generated. When a condition holds longer than its pending period, the rule fires.
4. Alertmanager sends a message along the route from the system description.
5. The person on call gets a message: what is wrong, in which service, the current value and threshold, the time in their zone, a link to the runbook.

| Part | What it does |
| --- | --- |
| OpenTelemetry Collector | Receives metrics, logs and traces; derives calls, errors and latency from traces |
| Prometheus | Stores metrics and evaluates rules every 15 seconds |
| Loki | Stores logs |
| Tempo | Stores traces |
| Grafana | Shows graphs, logs and traces, with a jump from a trace to its logs by `trace_id` |
| Alertmanager | Sends notifications to Telegram and email, groups repeats |
| Kamerton | Installs all of the above with one command, turns the description into rules, routes and runbooks, shows it in the UI |

## Single source of truth

- **The YAML description is the source of truth.** The UI is an editor over it: canvas, rule cards and YAML mode change the same text.
- **The description schema comes from Go types.** They produce the CRD and the JSON Schema; the same schema validates descriptions in the core and gives the YAML editor its hints.

## What else the core does

- **Discovery.** Lists services that already send telemetry, from span metrics in Prometheus.
- **Backtest.** Counts how many times a rule would have fired on Prometheus data.
- **Probable source.** When an alert fires, walks the `dependsOn` graph and shows the chain of affected services.
- **Sets of programs.** Each system reads the Prometheus and Alertmanager of its set; the set's labels go on its PrometheusRule and AlertmanagerConfig.

## Deleting objects

A system's objects carry an owner reference to its `SystemDescription`, so deleting a system removes all of them. An object a system stops generating stays until the system itself is deleted.
