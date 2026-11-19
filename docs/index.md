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

Not about checkout and frontend that fail with it. One alert about the cause, then a short message with the evidence, then a page that shows where it broke.

<p class="k-meta">Version 0.3.0, early. AGPL-3.0. <a href="/docs/quick-start">Quick start</a> · <a href="https://github.com/kamerton-labs/kamerton">GitHub</a> · <a href="https://github.com/kamerton-labs/kamerton/blob/main/CHANGELOG.md">What is new</a></p>

</header>

<div class="k-thread k-wide" role="group" aria-label="Example Telegram chat: the payment service of the demo shop is scaled to zero">

<div class="k-thread__row">
<p class="k-thread__time">16:51</p>
<div class="k-tg">
<p class="k-tg__from">via Alertmanager</p>
<p>🔴 <b>Critical</b> · otel-demo (demo)</p>
<p>🔴 <b>payment</b>: No ready pods<br>now <b>0 of 0 pods ready</b>, threshold at least one ready pod · since 16:50 16.11 UTC<br><span class="k-msg__link">Open in Kamerton</span></p>
</div>
<p class="k-thread__note">Straight from Alertmanager: it arrives even if Kamerton is down.</p>
</div>

<div class="k-thread__row">
<p class="k-thread__time">16:52</p>
<div class="k-tg">
<p class="k-tg__from">from Kamerton</p>
<p>🔎 <b>Probable cause</b> · otel-demo (demo)<br>Probable cause: <b>payment</b> (payment: No ready pods since 16:50 UTC).<br>Also affected: checkout, frontend.<br>What changed in <b>payment</b> in the last 30 min: payment scaled from 1 to 0 replicas at 16:50 UTC; no pods exist.</p>
<p class="k-tg__buttons"><span>Useful</span><span>Noise</span></p>
</div>
<p class="k-thread__note">The alerts of <code>checkout</code> and <code>frontend</code> were muted. They are only listed here.</p>
</div>

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
<p class="k-thread__note">Kept as "what helped".</p>
</div>

<p class="k-thread__skip">The next morning.</p>

<div class="k-thread__row">
<p class="k-thread__time">10:15</p>
<div class="k-tg">
<p class="k-tg__from">from Kamerton, after the same "No ready pods" alert</p>
<p>🔎 <b>Probable cause</b> · otel-demo (demo)<br>Probable cause: <b>payment</b> (payment: No ready pods since 10:14 UTC).<br>Also affected: checkout, frontend.<br>What changed in <b>payment</b> in the last 30 min: payment scaled from 1 to 0 replicas at 10:14 UTC; no pods exist.<br>🕘 <b>Happened before</b>: 16:50 16.11 UTC, lasted 12 min.<br>Cause: payment: No ready pods since 16:50 UTC<br>What helped: A cleanup script scaled payment to 0. Scaled it back to 1 replica, the script is off until Monday.<br>Times in the last 30 days: 1.</p>
<p class="k-tg__buttons"><span>Useful</span><span>Noise</span></p>
</div>
<p class="k-thread__note">The same failure the next day comes with yesterday's answer.</p>
</div>

</div>

<p class="k-under">Templates of the demo shop; times and the reply are made up.</p>

## Then you open it

<Shot name="now" class="k-wide" alt="The Now screen: Failure in checkout, requests are too slow; the map of the demo shop with checkout marked as the source" caption="A real one: checkout waits a minute to write each order to Kafka. Next: the service page and the request itself." />

<p class="k-under"><a href="/docs/failure">Looking into a failure</a></p>

## From a short description

Services, their type, what they call. The rest is generated: 195 rules for the 16 services of the demo shop, routes, dashboards.

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

## Three views of one description

<ThreeViews class="k-wide" />

## From a failure to the message

Scroll, and follow one failing payment.

<SignalPath class="k-wide" />

## Also

<dl class="k-facts">
<dt>Rules</dt><dd>Errors and latency per service and per operation, pods, queues, error budgets, "slower than usual", "requests stopped", "no data". <a href="/docs/rules">Library</a></dd>
<dt>Noise</dt><dd>Counts how often each rule fires and clears by itself, suggests a quieter value, never changes a rule on its own. <a href="/docs/quieter-rules">Quieter rules</a></dd>
<dt>Your Prometheus</dt><dd>Finds the one you already run and writes rules into it. <a href="/docs/existing-programs">Programs you already run</a></dd>
<dt>No SDK</dt><dd>Optional eBPF agent turns HTTP and gRPC calls into traces. <a href="/docs/configuration#services-without-opentelemetry">Read first</a></dd>
<dt>Not yet</dt><dd>One user, one cluster, no chart repository. <a href="/docs/limitations">Limitations</a></dd>
</dl>

## Install

<div class="vp-doc k-wide-code">

```sh
git clone --branch v0.3.0 https://github.com/kamerton-labs/kamerton.git && cd kamerton
helm install kamerton ./deploy/helm/kamerton \
  --namespace kamerton --create-namespace --dependency-update \
  --set externalURL=http://localhost:8080
```

</div>

<p class="k-under">Kubernetes 1.27+, Helm. Then the <a href="/docs/quick-start">quick start</a> or the <a href="/docs/demo">demo shop</a>.</p>

<VideoTour />

<p class="k-under">Kamerton is AGPL-3.0. Prometheus, Grafana, Loki, Tempo and the Collector are installed unchanged from their own charts, under their own licences. <a href="/docs/license">Licences</a></p>

</div>
