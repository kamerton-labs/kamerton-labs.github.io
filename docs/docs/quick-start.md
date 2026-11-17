# Quick start

From building the image to the first system description in a Kubernetes cluster. The observability programs are installed along with Kamerton.

::: warning No published image yet
The Kamerton image and a chart repository are not published yet. You build the image from source and install the chart from a clone of the repository.
:::

## Prerequisites

- A Kubernetes cluster, 1.27 or newer, and `kubectl`. Tested on single-node k3s.
- Helm. The chart is apiVersion v2, verified with Helm 4.3.
- Docker or another OCI image builder.
- A clone of the repository:

```sh
git clone https://github.com/kamerton-labs/kamerton.git
cd kamerton
```

## 1. Build the image

```sh
docker build -t kamerton:dev .
```

Make the image visible to the cluster, for example:

```sh
kind load docker-image kamerton:dev                        # kind
docker save kamerton:dev | sudo k3s ctr images import -    # k3s
```

Or push it to your registry and use that name in the next step.

## 2. Install with Helm

```sh
helm install kamerton ./deploy/helm/kamerton \
  --namespace kamerton --create-namespace --dependency-update \
  --set image.repository=kamerton --set image.tag=dev \
  --set externalURL=http://localhost:8080
```

This installs the Kamerton core (Deployment, Service, RBAC, CRD) and the observability programs as pinned chart dependencies: kube-prometheus-stack (Prometheus Operator, Prometheus, Alertmanager), Grafana, Loki, Tempo and the OpenTelemetry Collector. `--dependency-update` downloads those charts; no `helm repo add` is needed.

`externalURL` is the address people use to open the UI. Links in notifications point there. Without it notifications carry no links: in-cluster addresses do not open from a phone.

All chart settings: [Configuration](./configuration).

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
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reuse-values \
  --set auth.existingSecret=kamerton-auth
```

How the login works and what it does not do: [Security](./security).

## 5. Describe a system

In the UI press «Добавить систему» (Add system) and add services on the canvas. Services that already send telemetry are offered for one-click adding. Or apply a ready description file:

```sh
kubectl -n kamerton apply -f https://raw.githubusercontent.com/kamerton-labs/examples/main/otel-demo/system.yaml
kubectl -n kamerton get systemdescriptions
```

Descriptions that send notifications must live in Kamerton's namespace: an AlertmanagerConfig can only reference Secrets in its own namespace.

The format: [Describe a system](./describe-system).

## 6. Connect Telegram or email

Open «Каналы» (Channels) in the menu, paste the bot token or the mail server settings, add recipients. Details: [Notifications](./notifications).

## Next

- [Demo shop](./demo): Kamerton next to the OpenTelemetry Demo, switchable faults and a first alert.
- [Programs you already run](./existing-programs): your own Prometheus instead of the bundled one, several sets of programs.
- [Limitations and status](./limitations): what is not done yet.

## Run without a cluster

The core and the UI also run on your own machine, for example to look at the UI or check a description. You need Go 1.25, Node 24, pnpm 12 and make.

```sh
make run    # builds the UI and the core, serves on :8080 with the OTel Demo description
```

Without Prometheus, Alertmanager and Grafana addresses, discovery, backtest, alerts and program status say "not configured" instead of showing data. Set the addresses with `--prometheus-url`, `--alertmanager-url`, `--grafana-url` or on the «Состояние Kamerton» (Kamerton status) page. Descriptions are kept in files. Telegram and email channels and finding installed programs work only in a cluster.

Check a description and see which rules it produces from the command line:

```sh
bin/kamerton validate -f system.yaml
bin/kamerton generate -f system.yaml            # rule file to stdout
bin/kamerton generate -f system.yaml -o out/    # rules, dashboard, runbooks
bin/kamerton schema > systemdescription.schema.json
```
