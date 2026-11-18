# Demo shop

The easiest way to see Kamerton at work is next to the [OpenTelemetry Demo](https://github.com/open-telemetry/opentelemetry-demo), an open-source shop of about fifteen services with switchable faults. Kamerton was tested on it: the rules fire on the demo's built-in fault scenarios.

All files are in [kamerton-labs/examples](https://github.com/kamerton-labs/examples). Nothing there contains secrets; chat IDs and email addresses in the descriptions are placeholders.

## Prerequisites

A small Kubernetes cluster (kind, k3s, colima), `kubectl` and `helm`. Clone both repositories side by side:

```sh
git clone https://github.com/kamerton-labs/kamerton.git
git clone https://github.com/kamerton-labs/examples.git
cd kamerton
```

## 1. Install Kamerton with the whole stack

```sh
helm install kamerton ./deploy/helm/kamerton -n kamerton --create-namespace \
  --dependency-update -f ../examples/otel-demo/values-kamerton.yaml
```

The chart pulls the published image. `values-kamerton.yaml` keeps Prometheus small (7 days of data, 1Gi memory limit) and sets `externalURL: http://localhost:8080`, so links in notifications point to the port-forward. Change it when you expose Kamerton through an ingress.

## 2. Install the shop

The demo's own backends are off; all telemetry goes to Kamerton's Collector:

```sh
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm upgrade --install otel-demo open-telemetry/opentelemetry-demo \
  --version 0.42.6 -n otel-demo --create-namespace \
  -f ../examples/otel-demo/values-demo.yaml
```

## 3. Describe the shop and open the UI

```sh
kubectl -n kamerton apply -f ../examples/otel-demo/system.yaml
kubectl -n kamerton port-forward svc/kamerton 8080
```

The UI is at `http://localhost:8080`. Set up Telegram or email under "Channels" - see [Notifications](./notifications) - or replace the placeholder chat ID and addresses in `system.yaml` with your own.

::: warning Do this before step 4
The shop's description names a Telegram and an email receiver. Until the Secrets `kamerton-telegram` and `kamerton-smtp` exist, the Prometheus Operator rejects the whole Alertmanager configuration of the system: nothing is sent and alerts are not grouped by cause. Connect both channels under "Channels", or delete the receivers you do not use from the description. A known problem of 0.2.0.
:::

## 4. Break something

The shop has fault flags. Open its flag page:

```sh
kubectl -n otel-demo port-forward svc/frontend-proxy 8081:8080
```

Flags are at `http://localhost:8081/feature`. Turn one on, for example `paymentFailure`. Within a few minutes the alert appears under "Alerts" and in the configured channel. The UI also shows the chain of affected services with the probable source: Kamerton walks the `dependsOn` graph.

To see the grouping by cause and the follow-up message, take a service away entirely:

```sh
kubectl -n otel-demo scale deployment payment --replicas=0
```

In about a minute "No ready pods" arrives for `payment`, and about 45 seconds after it Kamerton's follow-up. The errors of `checkout` and `frontend` are muted. Scale it back to 1 a few minutes later: Telegram chats get "Incident over", and a reply to it is kept as what helped. What the messages look like is on the [front page](/), and what they contain in [Incidents](./incidents).

Keep in mind that the "no data" rules and a complete stop in "requests stopped" need a day of history, so on a freshly installed demo they stay quiet.

## What is in the shop's description

The demo description generates 195 rules for 16 services. It is a good example of a complete one: metric names in `telemetry`, a short window and short `for` so an alert arrives within minutes, own thresholds for the checkout and payment operations, availability objectives, and the Kafka topic `orders` with two consumer groups.

[otel-demo/system.yaml](https://github.com/kamerton-labs/examples/blob/main/otel-demo/system.yaml)
