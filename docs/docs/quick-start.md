# Quick start

From cloning the repository to the first system description in a Kubernetes cluster. The observability programs are installed along with Kamerton.

::: info No chart repository yet
The container image is published, but a chart repository is not. You install the chart from a clone of the repository.
:::

## Prerequisites

- A Kubernetes cluster, 1.27 or newer, and `kubectl`. Tested on single-node k3s.
- Helm. The chart is apiVersion v2, verified with Helm 4.3.
- A clone of the repository: the chart is installed from it.

## 1. Get the chart

```sh
git clone --branch v0.3.0 https://github.com/kamerton-labs/kamerton.git
cd kamerton
```

`--branch v0.3.0` takes the released version. Without it you get `main`, which may already hold changes of the next one.

The image is `ghcr.io/kamerton-labs/kamerton`, built for linux/amd64 and linux/arm64. The chart uses the tag that matches its version, so there is nothing to build.

## 2. Install with Helm

```sh
helm install kamerton ./deploy/helm/kamerton \
  --namespace kamerton --create-namespace --dependency-update \
  --set externalURL=http://localhost:8080
```

This installs the Kamerton core (Deployment, Service, RBAC, CRD) and the observability programs as pinned chart dependencies: kube-prometheus-stack (Prometheus Operator, Prometheus, Alertmanager), Grafana, Loki, Tempo and the OpenTelemetry Collector. `--dependency-update` downloads those charts; no `helm repo add` is needed.

`externalURL` is the address people use to open the UI. Links in notifications point there. Without it notifications carry no links: in-cluster addresses do not open from a phone.

All chart settings: [Configuration](./configuration). To run your own build of the core, build the image with `make docker`, make it available to the cluster and point `image.repository` and `image.tag` at it.

## 3. Open the UI

```sh
kubectl -n kamerton port-forward svc/kamerton 8080
```

Then open `http://localhost:8080`.

## 4. Set a login

Right after installation the UI and API are open to anyone who can reach them. The Channels screen shows a red notice about it. Turn the login on before you expose the UI beyond a port-forward:

```sh
kubectl -n kamerton create secret generic kamerton-auth \
  --from-literal=username=admin --from-literal=password='<strong password>'
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reset-then-reuse-values \
  --set auth.existingSecret=kamerton-auth
```

How the login works and what it does not do: [Security](./security).

## 5. Describe a system

In the UI press "Add system" and add services on the canvas. Services that already send telemetry are offered for one-click adding. Or apply a ready description file:

```sh
kubectl -n kamerton apply -f https://raw.githubusercontent.com/kamerton-labs/examples/main/otel-demo/system.yaml
kubectl -n kamerton get systemdescriptions
```

Descriptions that send notifications must live in Kamerton's namespace: an AlertmanagerConfig can only reference Secrets in its own namespace.

The format: [Describe a system](./describe-system).

## 6. Connect Telegram or email

Open "Channels" in the menu, paste the bot token or the mail server settings, add recipients. Details: [Notifications](./notifications).

The follow-up message after an alert needs no setup: it uses the same bot and mail server. The link to failing traces in it needs Grafana's address as people open it, `--set incidents.grafanaExternalURL=...`.

## 7. Services that send no traces (optional)

Kamerton's rules read span metrics, which come from traces. For services without OpenTelemetry the chart can install an eBPF agent that sees their HTTP and gRPC calls. It is off by default and runs privileged on every node. Read [Services without OpenTelemetry](./configuration#services-without-opentelemetry) first, then:

```sh
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reset-then-reuse-values \
  --set autoInstrument.enabled=true \
  --set 'autoInstrument.namespaces.include={shop}'
```

## Upgrade

```sh
git pull
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reset-then-reuse-values
```

`--reset-then-reuse-values` keeps the values you set and takes the defaults of new settings from the new chart. Plain `--reuse-values` does not know the new settings; with 0.2.3 that left the new pod crashing. Needs Helm 3.14 or newer.

## Next

- [Demo shop](./demo): Kamerton next to the OpenTelemetry Demo, switchable faults and a first alert.
- [Incidents](./incidents): what happens when a service fails, and the message that follows the alert.
- [Programs you already run](./existing-programs): your own Prometheus instead of the bundled one, several sets of programs.
- [Limitations and status](./limitations): what is not done yet.

## Run without a cluster

The core and the UI also run on your own machine, for example to look at the UI or check a description. You need Go 1.25, Node 24, pnpm 12 and make.

```sh
make run    # builds the UI and the core, serves on :8080 with the OTel Demo description
```

Without Prometheus, Alertmanager and Grafana addresses, discovery, backtest, alerts and program status say "not configured" instead of showing data. Set the addresses with `--prometheus-url`, `--alertmanager-url`, `--grafana-url` or on the "Kamerton status" page. Descriptions are kept in files. Telegram and email channels and finding installed programs work only in a cluster.

Check a description and see which rules it produces from the command line:

```sh
bin/kamerton validate -f system.yaml
bin/kamerton generate -f system.yaml            # rule file to stdout
bin/kamerton generate -f system.yaml -o out/    # rules, dashboard, runbooks
bin/kamerton schema > systemdescription.schema.json
```
