---
layout: home
markdownStyles: false
title: Kamerton - one message with the cause when a Kubernetes service fails
titleTemplate: false
description: Kamerton writes alert rules and routes for Prometheus and Alertmanager from a short system description. When a service fails, the alerts of the services that call it are muted, and a short message with the cause and the evidence follows the alert.
---

<div class="k-home">

<header class="k-top">

# When payment goes down, you hear about payment

The checkout and frontend alerts that follow from it are muted. Alertmanager sends the alert about payment itself, and about 45 seconds later Kamerton adds one short message: what else is affected, what changed in the workload, where it fails. When the incident is over, it asks what helped. The next time payment fails, the answer comes back with the alert.

<p class="k-meta">Version 0.2.0, early. AGPL-3.0 licence. <a href="/docs/quick-start">Quick start</a> · <a href="https://github.com/kamerton-labs/kamerton">Code on GitHub</a> · <a href="https://github.com/kamerton-labs/kamerton/blob/main/CHANGELOG.md">What changed in 0.2.0</a></p>

</header>

<div class="k-thread k-wide" role="group" aria-label="Example Telegram chat: the payment service of the demo shop is scaled to zero">

<div class="k-thread__row">
<p class="k-thread__time">16:51</p>
<div class="k-tg">
<p class="k-tg__from">via Alertmanager</p>
<p>🔴 <b>Critical</b> · otel-demo (demo)</p>
<p>🔴 <b>payment</b>: No ready pods<br>now <b>0 of 0 pods ready</b>, threshold at least one ready pod · since 16:50 16.11 UTC<br><span class="k-msg__link">Open in Kamerton</span></p>
</div>
<p class="k-thread__note">Someone scaled <code>payment</code> to zero. "No ready pods" waits only 30 seconds, so it comes before anything else. This message goes straight from Alertmanager and arrives even if Kamerton is down.</p>
</div>

<div class="k-thread__row">
<p class="k-thread__time">16:52</p>
<div class="k-tg">
<p class="k-tg__from">from Kamerton</p>
<p>🔎 <b>Probable cause</b> · otel-demo (demo)<br>Probable cause: <b>payment</b> (payment: No ready pods since 16:50 UTC).<br>Also affected: checkout, frontend.<br>What changed in <b>payment</b> in the last 30 min: payment scaled from 1 to 0 replicas at 16:50 UTC; no pods exist.</p>
<p class="k-tg__buttons"><span>Useful</span><span>Noise</span></p>
</div>
<p class="k-thread__note">The errors of <code>checkout</code> and <code>frontend</code> were never sent: inhibit rules built from <code>dependsOn</code> muted them. They are listed here instead. <code>email</code>, <code>accounting</code> and <code>fraud-detection</code> lose their traffic a few minutes later; their "no data" and "requests stopped" alerts are muted too.</p>
</div>

<div class="k-thread__row">
<p class="k-thread__time">16:55</p>
<div class="k-tg">
<p class="k-tg__from">via Alertmanager</p>
<p>🔴 <b>Critical</b> · otel-demo (demo)</p>
<p>🔴 <b>payment</b>: Requests stopped arriving<br>now <b>0.0 per min (normally 9.4)</b>, threshold 10% of normal · since 16:53 16.11 UTC</p>
</div>
<p class="k-thread__note">A second alert about the same service: calls to it have stopped. Kamerton mutes the callers of a failed service, not the service's own alerts.</p>
</div>

<p class="k-thread__skip">Two "Resolved" messages from Alertmanager at 17:02 are left out.</p>

<div class="k-thread__row">
<p class="k-thread__time">17:03</p>
<div class="k-tg">
<p class="k-tg__from">from Kamerton</p>
<p>✅ <b>Incident over</b> · otel-demo (demo): <b>payment</b> (No ready pods), lasted 12 min.<br>What helped? Reply to this message, and Kamerton will remind you the next time.</p>
</div>
</div>

<div class="k-thread__row">
<p class="k-thread__time">17:06</p>
<div class="k-tg k-tg--reply">
<p class="k-tg__quote">Incident over · otel-demo (demo): payment</p>
<p>A cleanup script scaled payment to 0. Scaled it back to 1 replica, the script is off until Monday.</p>
<p class="k-tg__react">👍</p>
</div>
<p class="k-thread__note">The reply is kept with the incident as "what helped". Kamerton confirms with 👍.</p>
</div>

<p class="k-thread__skip">The next morning.</p>

<div class="k-thread__row">
<p class="k-thread__time">10:15</p>
<div class="k-tg">
<p class="k-tg__from">from Kamerton, after the same "No ready pods" alert</p>
<p>🔎 <b>Probable cause</b> · otel-demo (demo)<br>Probable cause: <b>payment</b> (payment: No ready pods since 10:14 UTC).<br>Also affected: checkout, frontend.<br>What changed in <b>payment</b> in the last 30 min: payment scaled from 1 to 0 replicas at 10:14 UTC; no pods exist.<br>🕘 <b>Happened before</b>: 16:50 16.11 UTC, lasted 12 min.<br>Cause: payment: No ready pods since 16:50 UTC<br>What helped: A cleanup script scaled payment to 0. Scaled it back to 1 replica, the script is off until Monday.<br>Times in the last 30 days: 1.</p>
<p class="k-tg__buttons"><span>Useful</span><span>Noise</span></p>
</div>
<p class="k-thread__note">Nobody wrote a cause, so the line shows the one Kamerton collected. A cause can be added in the UI.</p>
</div>

</div>

The texts are what Kamerton's templates produce for the demo description, with Telegram's formatting. Times, the normal rate and the reply are made up for the example. Everything Kamerton itself sends is in English by default, or in Russian with `language: ru`.

## What has been tried, and what is new

Tried on a live cluster, a single-node k3s next to the OpenTelemetry Demo: the chart installs and runs, the rule library fires on the demo's own fault scenarios, alerts reach Telegram, sets of programs work.

Most of the chat above is new in 0.2.0: the "no ready pods" rule, the muting by cause, the follow-up, the "incident over" message and the history. So are the "no data" rules, the noise counts and the eBPF auto-instrumentation. They are covered by unit tests, against fake Kubernetes, Prometheus, Loki and Telegram APIs where they talk to those. They have had little time on a real cluster and are not yet on the list above. The auto-instrumentation ran on one k3s cluster only. There has been no long run for false alarms yet.

## When the service fails with errors instead of stopping

The follow-up has whatever Kamerton found within a few minutes, and nothing else. For a service that still runs but fails, that usually means the operation with most errors, a line from its error log in Loki and a link to the failing traces in Grafana:

<div class="k-msg k-msg--plain" role="group" aria-label="Part of a follow-up message about failing calls">
<p>What changed in <b>payment</b> in the last 30 min: new version at 09:14 UTC+5 (v1.4.2 -> v1.4.3); container payment restarted 3 times (OOMKilled, exit code 137).<br>Most errors: operation <b>oteldemo.PaymentService/Charge</b> (42 failed calls in 30 min).<br>Log: <i>“card declined: upstream timeout”</i><br><span class="k-msg__link">Failing traces in Grafana</span></p>
</div>

The workload part comes from the Kubernetes API: new ReplicaSets with their image tags, scaling, restarts with the reason, pods not ready, Warning events. The trace link needs `incidents.grafanaExternalURL`. A log line is shortened, not scrubbed: whatever the service writes to its log can end up in the chat. Details, switches and the alerts API are in [Incidents](/docs/incidents).

## It all starts from a short description

You list the services, their type and what they depend on. Kamerton installs Prometheus, Alertmanager, Grafana, Loki, Tempo and the OpenTelemetry Collector from their own charts, writes the alert rules and the routes to Telegram and email, and keeps them in line with the description. The `dependsOn` lists are what tells it that `checkout` calls `payment`.

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

<p class="k-file">kamerton generate -f system.yaml, one rule of 195</p>

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

<p class="k-file">When it fires and payment is fine, Telegram gets</p>

<div class="k-msg" role="group" aria-label="Example Telegram message">
<p><span class="k-msg__dot" aria-hidden="true"></span><b>Critical</b> · otel-demo (demo)</p>
<p><span class="k-msg__dot" aria-hidden="true"></span><b>checkout</b>: Too many failed requests<br>now <b>12.3%</b>, threshold 5% · since 09:18 16.11 UTC+5<br><span class="k-msg__link">Open in Kamerton</span></p>
</div>

</div>
</div>

The 16 services of the demo get 195 rules. Nearly every threshold in them comes from `defaults`; a value of its own is set only where it is needed, such as a 1% error threshold for the `Charge` operation of `payment`. The value and time in the message are made up for the example.

## You can edit the canvas, the rule list and the YAML in any order

<ThreeViews class="k-wide" />

These are three views of one description. A service added on the canvas shows up in the YAML straight away. A threshold changed in a rule card changes only that place in the text, and the comments around it stay. The screenshots come from the UI running locally without a cluster, which is why the rules say "no data". The UI is in English; Russian can be picked in the language menu in the sidebar.

## What happens between a failure and the message

The service knows nothing about Kamerton. It sends telemetry to the Collector, ordinary programs do the rest, and Kamerton is responsible for what is written into them.

<SignalPath class="k-wide" />

Alertmanager also passes every notification to Kamerton's webhook. That is where the follow-up starts: Kamerton reads the dependency graph, the Kubernetes API, Prometheus and Loki, and sends its message through the same bot and mail server.

## Which rules you get

For every `http` or `grpc` service Kamerton checks the error share and latency, for the service and for each of its operations, so a failing rare operation is not hidden by healthy traffic. Pods get memory, CPU, restarts, OOMKilled and "no ready pods". Queues get consumer group lag and a check that someone still reads them. If an availability objective is set, burn-rate rules for the error budget are added.

Error rules do not fire on a single failure in a quiet service: they need a minimum rate of calls. Latency rules need only three calls in the window, so orders that come in twice a minute are checked too.

### Rules without thresholds

Some rules compare a service with itself. "Slower than usual" fires when latency is five times what it was over the past hour. "Requests stopped" catches a service nobody can reach: it writes no errors, its traffic just drops below 10% of the daily average. Memory near the limit is judged by the trend over an hour.

Two rules watch the data itself. If one service stops sending span metrics while the others still do, or the whole system goes silent because the Collector or Prometheus broke, you get "no data" instead of a quiet chat. Both fire only at hours when the service normally has traffic, judged by the same hours a week ago, so an idle test cluster at night stays quiet. All these rules wait for history: an hour for most of them, a day for "no data" and for a complete stop.

Before you turn a rule on or move a threshold, its card shows how many times it would have fired over the last day, three or seven days on the data Prometheus already holds. The full list with fields and defaults is in the [rule library](/docs/rules).

## Rules that cry wolf

A rule that fires forty times a week and clears by itself each time teaches people to ignore it. Kamerton counts this per rule from the alert history in Prometheus, leaves out the firings that were consequences of another service's failure, and for a noisy rule suggests a higher threshold or a longer wait, with the delay it would add. People can mark an alert as useful or noise, in the UI or with the two buttons under the follow-up. Kamerton never changes a rule by itself. More in [Quieter rules](/docs/quieter-rules).

## If you already run Prometheus

You do not need a second one. The "Find installed" button asks the Kubernetes API for services and Prometheus Operator resources, checks each candidate with a request and offers to use it. The network is not scanned, and Kamerton sends only GET requests to the addresses it finds.

If each team has its own Prometheus, create several sets of programs and pick a set for each system. Rules and routes are delivered as PrometheusRule and AlertmanagerConfig objects with the labels the right operator instance selects. Your own Prometheus cannot be connected without Prometheus Operator yet. More in [Programs you already run](/docs/existing-programs).

<Shot name="status" class="k-wide-half" alt="The Kamerton status page with two sets of programs" caption="Two sets of programs. Without a cluster they are shown as not connected." />

## Services that send no traces

Almost every rule reads span metrics, which the Collector derives from traces. For services without OpenTelemetry the chart can install OpenTelemetry eBPF Instrumentation, which sees HTTP and gRPC calls from the kernel and sends them as traces. It is off by default. Each of its pods is a privileged container with access to the node, and some services that already have an SDK get counted twice. Read [the section about it](/docs/configuration#services-without-opentelemetry) before you turn it on.

## How a message reads

Kamerton replaces Alertmanager's templates with its own. The first line has the severity, the system and the environment. Then one line per alert: the service, what happened, the current value and the threshold, since when. Times are in the team's zone with the offset, for example "09:18 16.11 UTC+5". With `externalURL` set, each alert links to its page in the UI. Grouped alerts are listed up to eight, then a count.

Any rule can have its own title, explanation and first action for the person on call, with the placeholders `{value}`, `{threshold}`, `{service}`, `{since}`. Channels are connected in the UI. The bot token and the mail password are kept only in Secrets and never end up in the description. More in [Notifications](/docs/notifications).

<Shot name="channels" :dark="false" class="k-wide-half" alt="The Notification channels page: a connected Telegram bot, three chats and email" caption="The channels screen. The bot and chats in the screenshot are for demonstration: channels cannot be set up in a local run." />

## What it does not do yet

There is one shared user, with no roles and no audit log. One installation works with one cluster. There is no chart repository yet: the chart is installed from a clone.

The rules that compare with normal need history. On the first day after installation "no data" and the complete-stop case of "requests stopped" cannot fire, and a service that only works in the daytime is not checked in the hour after its usual start and the hour before its usual end.

The incident history keeps at most 300 incidents of the last 180 days. The evidence shown in the UI lives in the memory of one replica, so after a restart an incident shows none until its next follow-up.

With auto-instrumentation on, the agent misses some SDKs: on the test cluster nginx with the OpenTelemetry module, a C++ and a Python grpcio service were counted twice. Error shares stay right, request rates do not.

Email has been tested only against a test SMTP server. The rest is in [Limitations and status](/docs/limitations).

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
| OpenTelemetry eBPF Instrumentation, only with `autoInstrument.enabled` | Apache-2.0 | opentelemetry-ebpf-instrumentation |

</div>

The code and the Helm chart are in [kamerton-labs/kamerton](https://github.com/kamerton-labs/kamerton); the demo shop and the second-Prometheus example are in [kamerton-labs/examples](https://github.com/kamerton-labs/examples).

</div>
