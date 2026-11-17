# Configuration

The Helm values and core flags that matter most. The full list with comments is in [values.yaml](https://github.com/kamerton-labs/kamerton/blob/main/deploy/helm/kamerton/values.yaml).

Secrets — the Telegram bot token, the SMTP password, the Grafana admin password — are never set in values. See [Security](./security).

## Kamerton core

| Value | Default | What it sets |
| --- | --- | --- |
| `image.repository`, `image.tag` | `ghcr.io/kamerton-labs/kamerton`, chart version | The core image. No image is published yet: build your own and point these at it. |
| `replicaCount` | `1` | Replicas. More than one requires `controller.leaderElect=true`. |
| `controller.enabled` | `true` | The controller that applies system descriptions. |
| `controller.leaderElect` | `false` | Leader election; needed with several replicas. Telegram polling runs on the leader only. |
| `controller.watchNamespace` | empty | Namespace to watch for descriptions. Empty: all namespaces. |
| `externalURL` | empty | The UI address as people open it. Links in notifications point there; empty: no links. |
| `descriptionName` | empty | Which description the old single-description API edits when there are several. |
| `logLevel` | `info` | Log level. |
| `service.type`, `service.port` | `ClusterIP`, `8080` | The core's Service. |
| `resources` | requests 50m CPU and 64Mi, limit 256Mi | Core resources. |

The core runs as non-root, with a read-only root filesystem, no privilege escalation and all Linux capabilities dropped (`podSecurityContext`, `securityContext`).

## Channels

| Value | Default | What it sets |
| --- | --- | --- |
| `telegram.uiSetup` | `true` | Grant the core access to the bot token Secret. `false`: you manage the Secret and the UI cannot store tokens. |
| `telegram.secretName` | `kamerton-telegram` | Secret holding the token (key `bot-token`). |
| `email.uiSetup` | `true` | The same for the SMTP password. |
| `email.secretName` | `kamerton-smtp` | Secret holding the SMTP password (key `password`). |

## Login

| Value | Default | What it sets |
| --- | --- | --- |
| `auth.existingSecret` | empty | A Secret with keys `username`, `password` and optionally `session-secret`. Preferred. |
| `auth.username`, `auth.password` | empty | The chart creates the Secret from these. Helm keeps the password in its release record. |

Login is off until one of the two is set.

## Sets of programs

| Value | Default | What it sets |
| --- | --- | --- |
| `stacks.configMapName` | `kamerton-stacks` | ConfigMap holding the sets. |
| `stacks.discovery.enabled` | `true` | «Найти установленные» (Find installed): read access to Services and Prometheus Operator resources. |
| `endpoints.*` | addresses of the bundled programs | Prometheus, Alertmanager, Grafana, Loki, Tempo and Collector health addresses — the built-in set. |
| `bringYourOwn.prometheus.enabled`, `url`, `alertmanagerUrl` | off | Your own Prometheus and Alertmanager. Disable `kube-prometheus-stack.enabled`. |
| `bringYourOwn.grafana.enabled`, `url` | off | Your own Grafana. Disable `grafana.enabled`. |

## Bundled programs

Installed from their own charts, versions pinned in `Chart.yaml`. Each has `<name>.enabled`.

| Value | What matters |
| --- | --- |
| `kube-prometheus-stack` | Prometheus evaluates rules every 15 seconds (`evaluationInterval: 15s`), keeps 15 days (`retention: 15d`), accepts remote write from the Collector. Alertmanager picks AlertmanagerConfigs labelled `kamerton.dev/managed: "true"`. |
| `grafana` | The chart generates the admin password into the Secret `kamerton-grafana`. Data sources: the bundled Prometheus, Loki and Tempo. Dashboards are picked up from ConfigMaps labelled `grafana_dashboard`. |
| `loki` | One instance, filesystem storage. |
| `tempo` | Chart defaults. |
| `opentelemetry-collector` | Takes OTLP. Traces to Tempo, span metrics (spanmetrics, flushed every 15 seconds) to Prometheus, logs to Loki. |

## Core flags

Needed when running without Helm, for example locally. Every flag has a `KAMERTON_*` environment variable.

| Flag | What it sets |
| --- | --- |
| `--description` | Comma-separated description files or a directory (new systems are created there). Local mode. |
| `--listen-address` | UI and API address, default `:8080`. |
| `--prometheus-url`, `--alertmanager-url`, `--grafana-url` | Program addresses. Without them discovery, backtest, alerts and program status say "not configured". |
| `--loki-url`, `--tempo-url`, `--otel-collector-health-url` | Addresses for the status page. |
| `--external-url` | UI address for links in notifications. |
| `--stacks-file` | File holding the sets of programs in local mode. Default `.kamerton-stacks.json` next to the descriptions. |
| `--env-file` | File with `KAMERTON_*` variables, default `.env`. Variables already set in the environment win. |
| `--enable-controller`, `--leader-elect`, `--watch-namespace` | The Kubernetes controller. |
| `--log-level` | `debug`, `info`, `warn`, `error`. |

Login variables: `KAMERTON_AUTH_USER`, `KAMERTON_AUTH_PASSWORD`, optionally `KAMERTON_AUTH_SECRET`.

## Command line

```sh
kamerton serve                      # core and UI
kamerton validate -f system.yaml    # check a description
kamerton generate -f system.yaml    # rules to stdout; -o DIR for rules, dashboard, runbooks
kamerton schema                     # JSON Schema of the description
```
