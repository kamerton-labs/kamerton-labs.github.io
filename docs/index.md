---
layout: home
markdownStyles: false
title: Kamerton - alert rules and notifications for Kubernetes services from their description
titleTemplate: false
description: Kamerton installs Prometheus, Alertmanager, Grafana, Loki, Tempo and the OpenTelemetry Collector with one Helm command and writes their alert rules and routes from a short system description.
---

<div class="k-home">

<header class="k-top">

# Kamerton sets up monitoring for Kubernetes services from a short description

You list the services, their type and what they depend on. Kamerton installs Prometheus, Alertmanager, Grafana, Loki, Tempo and the OpenTelemetry Collector from their own charts, writes the alert rules and the routes to Telegram and email, and then keeps them in line with the description. Below is a real piece of the demo shop description and one of the rules Kamerton made from it.

<p class="k-meta">Version 0.1.0, early. AGPL-3.0 licence. <a href="/docs/quick-start">Quick start</a> · <a href="https://github.com/kamerton-labs/kamerton">Code on GitHub</a></p>

</header>

<div class="k-pair k-wide">
<div class="k-pair__side vp-doc">

<p class="k-file">testdata/otel-demo/system.yaml, the beginning</p>

```yaml
kind: SystemDescription
metadata:
  name: otel-demo
spec:
  environment: demo
  defaults:
    namespace: otel-demo
    rateWindow: 2m
    errorRate:
      threshold: 0.05
      minRequestsPerSecond: 0.05
      for: 1m
  services:
    - name: checkout
      type: grpc
      critical: true
      dependsOn: [cart, currency, email, payment, …]
    # … 15 more services and the alert receivers
```

</div>
<div class="k-pair__side vp-doc">

<p class="k-file">kamerton generate -f system.yaml, one rule of 164</p>

```yaml
- alert: KamertonErrorRateHigh
  expr: |-
    (
    (
      sum by (service_name) (rate(traces_span_metrics_calls_total{service_name="checkout", …, status_code="STATUS_CODE_ERROR"}[2m]))
    /
      sum by (service_name) (rate(traces_span_metrics_calls_total{service_name="checkout", …}[2m]))
    ) > 0.05
    )
    and on (service_name)
    (
      sum by (service_name) (rate(traces_span_metrics_calls_total{service_name="checkout", …}[2m])) > 0.05
    )
  for: 1m
  labels:
    service: checkout
    severity: critical
    # …
  annotations:
    kamerton_title: Too many failed requests
    kamerton_threshold: 5%
```

<p class="k-file">When it fires, Telegram gets</p>

<div class="k-msg" role="group" aria-label="Example Telegram message">
<p><span class="k-msg__dot" aria-hidden="true"></span><b>Critical</b> · otel-demo (demo)</p>
<p><span class="k-msg__dot" aria-hidden="true"></span><b>checkout</b>: Too many failed requests<br>now <b>12.3%</b>, threshold 5% · since 09:18 16.11 UTC+5<br><span class="k-msg__link">Open in Kamerton</span></p>
</div>

</div>
</div>

The 16 services of the demo get 164 rules. Nearly every threshold in them comes from `defaults`; a value of its own is set only where it is needed, such as a 1% error threshold for the `Charge` operation of `payment`. The words in the rule and the message are Kamerton's default English text. The value and time in the message are made up for the example.

## You can edit the canvas, the rule list and the YAML in any order

<ThreeViews class="k-wide" />

These are three views of one description. A service added on the canvas shows up in the YAML straight away. A threshold changed in a rule card changes only that place in the text, and the comments around it stay. The screenshots come from the UI running locally without a cluster, which is why the rules say "no data". The UI is in English; Russian can be picked in the language menu in the sidebar.

## What happens between a failure and the message

The service knows nothing about Kamerton. It sends telemetry to the Collector, ordinary programs do the rest, and Kamerton is responsible for what is written into them.

<SignalPath class="k-wide" />

## Which rules you get

The rule library covers requests, pod resources, queues and availability objectives. For every `http` or `grpc` service Kamerton checks the error share and latency, for the service and for each of its operations, so a failing rare operation is not hidden by healthy traffic. Pods get memory, CPU, restarts and OOMKilled. Queues get consumer group lag. If an availability objective is set, burn-rate rules for the error budget are added.

Error rules do not fire on a single failure in a quiet service: they need a minimum rate of calls. Latency rules need only three calls in the window, so orders that come in twice a minute are checked too.

### Rules without thresholds

Some rules compare a service with itself. "Slower than usual" fires when latency is five times what it was over the past hour. "Requests stopped" catches a service nobody can reach: it writes no errors, its traffic just drops below 10% of the daily average. "Queue no longer consumed" looks at whether the group offset moves. Memory near the limit is judged by the trend over an hour. While there is too little history these rules stay quiet.

Before you turn a rule on or move a threshold, its card shows how many times it would have fired over the last day, three or seven days on the data Prometheus already holds. The full list with fields and defaults is in the [rule library](/docs/rules).

## If you already run Prometheus

You do not need a second one. The "Find installed" button asks the Kubernetes API for services and Prometheus Operator resources, checks each candidate with a request and offers to use it. The network is not scanned, and Kamerton sends only GET requests to the addresses it finds.

If each team has its own Prometheus, create several sets of programs and pick a set for each system. Rules and routes are delivered as PrometheusRule and AlertmanagerConfig objects with the labels the right operator instance selects. Your own Prometheus cannot be connected without Prometheus Operator yet. More in [Programs you already run](/docs/existing-programs).

<Shot name="status" class="k-wide-half" alt="The Kamerton status page with two sets of programs" caption="Two sets of programs. Without a cluster they are shown as not connected." />

## How a message reads

Kamerton replaces Alertmanager's templates with its own. The first line has the severity, the system and the environment. Then one line per alert: the service, what happened, the current value and the threshold, since when. Times are in the team's zone with the offset, for example "09:18 16.11 UTC+5". With `externalURL` set, each alert links to its page in the UI. Grouped alerts are listed up to eight, then a count.

Messages are in English by default, or in Russian with `language: ru`. Any rule can have its own title, explanation and first action for the person on call, with the placeholders `{value}`, `{threshold}`, `{service}`, `{since}`. Channels are connected in the UI. The bot token and the mail password are kept only in Secrets and never end up in the description. More in [Notifications](/docs/notifications).

<Shot name="channels" :dark="false" class="k-wide-half" alt="The Notification channels page: a connected Telegram bot, three chats and email" caption="The channels screen. The bot and chats in the screenshot are for demonstration: channels cannot be set up in a local run." />

## What it does not do yet

There is no chart repository yet: the chart is installed from a clone. There is one shared user, with no roles and no audit log. The UI and messages are available in two languages, English and Russian. One installation works with one cluster. We have tested Kamerton on a single-node k3s next to the OpenTelemetry Demo, but there has been no long run for false alarms yet: a 72-hour run under real load is planned. Email has been tested only against a test SMTP server. The rest is in [Limitations and status](/docs/limitations).

## How to install it

You need Kubernetes 1.27 or newer and Helm. The chart is installed from a clone of the repository and pulls the published image `ghcr.io/kamerton-labs/kamerton` (amd64 and arm64). The observability programs are installed as chart dependencies with pinned versions.

<div class="vp-doc k-wide-code">

```sh
git clone https://github.com/kamerton-labs/kamerton.git && cd kamerton
helm install kamerton ./deploy/helm/kamerton \
  --namespace kamerton --create-namespace --dependency-update \
  --set externalURL=http://localhost:8080
```

</div>

How to open the UI, turn on sign-in and describe a first system is in the [quick start](/docs/quick-start). The demo shop with its failure scenarios is described in [the demo section](/docs/demo).

<VideoTour />

## Licences

Kamerton is licensed under the GNU AGPL v3.0 only. The observability programs are installed unchanged from their own charts and images and have their own authors and licences. Kamerton configures them through Kubernetes resources and HTTP APIs. More in [Licence and third-party programs](/docs/license).

<div class="vp-doc">

| Program | Licence | Chart |
| --- | --- | --- |
| Prometheus, Prometheus Operator, Alertmanager | Apache-2.0 | kube-prometheus-stack |
| OpenTelemetry Collector | Apache-2.0 | opentelemetry-collector |
| Grafana | AGPL-3.0 | grafana |
| Loki | AGPL-3.0 | loki |
| Tempo | AGPL-3.0 | tempo |

</div>

The code and the Helm chart are in [kamerton-labs/kamerton](https://github.com/kamerton-labs/kamerton); the demo shop and the second-Prometheus example are in [kamerton-labs/examples](https://github.com/kamerton-labs/examples).

</div>
