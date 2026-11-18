# Configuration

The Helm values and core flags that matter most. The full list with comments is in [values.yaml](https://github.com/kamerton-labs/kamerton/blob/main/deploy/helm/kamerton/values.yaml).

Secrets - the Telegram bot token, the SMTP password, the Grafana admin password - are never set in values. See [Security](./security).

## Kamerton core

| Value | Default | What it sets |
| --- | --- | --- |
| `image.repository`, `image.tag` | `ghcr.io/kamerton-labs/kamerton`, chart version | The core image, published for linux/amd64 and linux/arm64. An empty tag means the chart's version. For your own build (`make docker`), point these at it. |
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

## Incidents

Muting alerts by cause needs nothing here: it is generated into each system's AlertmanagerConfig and switched with `spec.notifications.groupByCause`. These values are for the [follow-up message](./incidents#the-follow-up-message).

| Value | Default | What it sets |
| --- | --- | --- |
| `incidents.followUp.enabled` | `true` | Alertmanager also sends each notification to Kamerton's webhook, and Kamerton sends the follow-up. `false`: no webhook in the generated routing at all. Needs `controller.enabled`; only descriptions in the release namespace get the webhook. |
| `incidents.followUp.secretName` | `kamerton-webhook` | Secret with the bearer token Alertmanager sends (key `token`). Kamerton creates it with a random token when it is missing. |
| `incidents.followUp.workloadRead` | `true` | Read-only access to pods, events, ReplicaSets and StatefulSets in all namespaces, for the "what changed" part. `false` drops these permissions and that part. |
| `incidents.tailMute` | `10m` | How long the consequences of an incident stay silenced in Alertmanager after its cause is gone. `"0"` turns it off. See [Incidents](./incidents#after-the-cause-is-gone). |
| `incidents.grafanaExternalURL` | empty | Grafana as people open it, for the link to failing traces. Empty: no link. |

Per system, the follow-up and the "incident over" message are switched in the description: `spec.notifications.evidenceFollowUp` and `spec.notifications.askWhatHelped`.

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
| `stacks.discovery.enabled` | `true` | "Find installed": read access to Services and Prometheus Operator resources. |
| `endpoints.*` | addresses of the bundled programs | Prometheus, Alertmanager, Grafana, Loki, Tempo and Collector health addresses - the built-in set. |
| `bringYourOwn.prometheus.enabled`, `url`, `alertmanagerUrl` | off | Your own Prometheus and Alertmanager. Disable `kube-prometheus-stack.enabled`. |
| `bringYourOwn.grafana.enabled`, `url` | off | Your own Grafana. Disable `grafana.enabled`. |

## Bundled programs

Installed from their own charts, versions pinned in `Chart.yaml`. Each has `<name>.enabled`.

| Value | What matters |
| --- | --- |
| `kube-prometheus-stack` | Prometheus evaluates rules every 15 seconds (`evaluationInterval: 15s`), keeps 15 days (`retention: 15d`), accepts remote write from the Collector and samples up to 30 minutes late (`tsdb.outOfOrderTimeWindow: 30m`; without it one late sample makes Prometheus reject the whole write request). Alertmanager picks AlertmanagerConfigs labelled `kamerton.dev/managed: "true"` and keeps their matchers as written (`alertmanagerConfigMatcherStrategy: None`), which the grouping by cause needs. |
| `grafana` | The chart generates the admin password into the Secret `kamerton-grafana`. Data sources: the bundled Prometheus, Loki and Tempo. Dashboards are picked up from ConfigMaps labelled `grafana_dashboard`. |
| `loki` | One instance, filesystem storage. |
| `tempo` | Chart defaults. |
| `opentelemetry-collector` | Takes OTLP. Traces to Tempo, span metrics (spanmetrics, flushed every 15 seconds) to Prometheus, logs to Loki. `metrics_expiration: 2m` stops exporting a silent service, so that its "no data" alert can fire. |
| `opentelemetry-ebpf-instrumentation` | Off unless `autoInstrument.enabled`. See below. |

## Services without OpenTelemetry

Almost every rule reads span metrics, which the Collector derives from traces. A service that sends no traces gets little from Kamerton. For such services the chart can install [OpenTelemetry eBPF Instrumentation](https://opentelemetry.io/docs/zero-code/obi/) (OBI v1.0.0, Apache-2.0, formerly Grafana Beyla). It is off by default.

```sh
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reuse-values \
  --set autoInstrument.enabled=true \
  --set 'autoInstrument.namespaces.include={shop}'
```

It runs as the DaemonSet `kamerton-auto-instrument`. On each node it attaches eBPF probes to the kernel and to the processes, without code changes or restarts, and sends the HTTP and gRPC calls it sees as traces to Kamerton's Collector. The Collector turns them into the same span metrics as SDK traces, so the rules, the dashboard and "Found in telemetry" work as they are.

**Before you turn it on.**

- Linux 5.8 or newer with BTF (`ls /sys/kernel/btf/vmlinux`), amd64 or arm64.
- By default each agent pod is a **privileged container with `hostPID: true`**: all capabilities, host devices, no AppArmor or seccomp confinement. No host network, no host paths. Kamerton's namespace must admit privileged pods (Pod Security level `privileged`). On the test cluster, with only the capabilities OBI's documentation lists, the agent recorded nothing; privileged, it worked. What that access means: [Security](./security#auto-instrumentation).
- Memory grows with the number of processes it watches: about 900Mi on one node with 26 demo pods, and 1Gi was OOMKilled. Request 512Mi, limit 2Gi.
- It was tried on one single-node k3s cluster only.

**Start with an include list.** Watching every namespace also instruments programs nobody would describe. List the namespaces of the services that have no SDK in `autoInstrument.namespaces.include`. Monitoring programs and browsers, such as a load generator's headless Chromium, are left out by executable.

**Counted twice.** Services that already send OpenTelemetry are left out by default (`autoInstrument.skipSDKInstrumented`). The agent recognises pods injected by the OpenTelemetry Operator and processes it has seen making a successful OTLP export. That second check misses some SDKs. On the test cluster, server call rates with the agent on, against an hour before:

| Service (SDK) | With the agent | Before |
| --- | --- | --- |
| image-provider (nginx, OTel module) | 12.9/s | 4.4/s |
| currency (C++) | 1.78/s | 1.18/s |
| recommendation (Python, grpcio) | 1.68/s | 0.98/s |

Go, Java, .NET and Node.js services were not counted twice. Doubling leaves error shares and latency mostly as they are, but request rates are too high, and "requests stopped" compares with a normal that changes when the agent is turned on or off. Find the services the agent reports:

```text
count by (job) (target_info{telemetry_distro_name="opentelemetry-ebpf-instrumentation"})
```

A service in that list that also has its own SDK is counted twice. Leave its pods out with the annotation `kamerton.dev/auto-instrument: "false"` on the pod template.

**Names differ a little from SDKs.** The service name comes from `OTEL_SERVICE_NAME`, the pod annotation `resource.opentelemetry.io/service.name`, the label `app.kubernetes.io/name` or the workload name, in that order. If it differs from the name in your description, set `telemetryName`. HTTP span names are `METHOD /path` with numbers and IDs as `*` (`GET /orders/*`), where SDKs usually give the route template; set `autoInstrument.httpRoutes.patterns` to the templates if your `operations` use them. A request that gets no response at all is not counted as an error.

| Value | Default | What it sets |
| --- | --- | --- |
| `autoInstrument.enabled` | `false` | Install the agent. |
| `autoInstrument.namespaces.include` | empty: all | Namespaces to watch. |
| `autoInstrument.namespaces.exclude` | `[kube-system]` | Namespaces to skip. Kamerton's own is always skipped. |
| `autoInstrument.excludeExecutables` | monitoring programs, browsers | Executables never instrumented (globs). |
| `autoInstrument.skipSDKInstrumented` | `true` | Leave out services that already send OpenTelemetry. |
| `autoInstrument.httpRoutes.patterns` | empty | Path templates for span names, for example `/orders/{id}`. |
| `autoInstrument.httpRoutes.ignored` | `/metrics`, `/healthz`, `/readyz`, `/livez` | Paths not recorded, so probes do not count as traffic. |
| `autoInstrument.runtimeInjection` | `false` | Attach a Java agent to JVMs and signal Node.js processes. Off: the agent only observes. |
| `opentelemetry-ebpf-instrumentation.privileged` | `true` | `false` runs as UID 0 with hostPID, a fixed list of capabilities plus `extraCapabilities` and a read-only root filesystem. Not yet tried on a cluster. |
| `opentelemetry-ebpf-instrumentation.extraCapabilities` | `[SYS_ADMIN]` | Needed to enter pods' network namespaces in the mode above. `SYS_ADMIN` is close to root anyway. |

The agent reads its settings only when it starts. After changing them:

```sh
kubectl -n kamerton rollout restart daemonset/kamerton-auto-instrument
```

## Core flags

Needed when running without Helm, for example locally. Every flag has a `KAMERTON_*` environment variable.

| Flag | What it sets |
| --- | --- |
| `--description` | Comma-separated description files or a directory (new systems are created there). Local mode. |
| `--listen-address` | UI and API address, default `:8080`. |
| `--prometheus-url`, `--alertmanager-url`, `--grafana-url` | Program addresses. Without them discovery, backtest, alerts and program status say "not configured". |
| `--loki-url`, `--tempo-url`, `--otel-collector-health-url` | Addresses for the status page. |
| `--external-url` | UI address for links in notifications. |
| `--alertmanager-webhook-url` | Kamerton's webhook as Alertmanager reaches it, for example `http://kamerton.kamerton.svc:8080/api/v1/hooks/alertmanager`. Empty: no follow-up messages. The chart sets it. |
| `--webhook-secret-name` | Secret with the webhook token, default `kamerton-webhook`. |
| `--workload-evidence` | Let follow-ups read pods, ReplicaSets, StatefulSets and events. Default `true`. |
| `--grafana-external-url` | Grafana as people open it, for trace links in follow-ups. |
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
