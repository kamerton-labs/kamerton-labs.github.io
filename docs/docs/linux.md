# On a Linux server

A short path from a plain Linux server to a running Kamerton. Kamerton itself runs in Kubernetes, so the first step is a small single-node cluster on the server.

This is what we ran: Kamerton 0.2.0, then 0.2.1, and later a clean 0.3.0, with the demo shop on one Ubuntu 24.04 server that was already busy with nginx and Docker workloads.

## What it takes

Measured on the 0.3.0 run:

| | Memory | Notes |
| --- | --- | --- |
| Kamerton with Prometheus, Alertmanager, Grafana, Loki, Tempo and the Collector | about 1.3 GB | right after installation, almost no data yet |
| The demo shop | about 3 GB | optional |
| The cluster itself with everything in it | about 8 GB | as Docker reported for the node container |

Disk: about 16 GB of container images with the shop. The chart claims 20 GB for Prometheus (15 days), 10 GB for Loki and 10 GB for Tempo (a week of traces). On the demo shop each of Prometheus and Tempo grows by roughly 0.7 GB a day.

`helm install` itself took 25 seconds, and all pods were running 75 seconds after it, on a fast connection.

## 1. A cluster

Pick one.

### The server already runs other things

Use k3s inside a Docker container with [k3d](https://k3d.io). It takes no ports on the host, leaves the firewall and your web server alone, and goes away with one command. This is the way we tested.

You need Docker, [k3d](https://k3d.io/stable/#installation), [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/) and [Helm](https://helm.sh/docs/intro/install/).

```sh
k3d cluster create kamerton \
  --api-port 127.0.0.1:6550 --no-lb \
  --servers-memory 14g \
  --k3s-arg "--disable=traefik@server:0" \
  --k3s-arg "--disable=servicelb@server:0"
kubectl get nodes
```

`--servers-memory` caps what the whole cluster may use, so a runaway pod cannot starve the rest of the server. The Kubernetes API listens on localhost only.

### A clean server

Install [k3s](https://docs.k3s.io/quick-start) straight on the host. Our own test stand is a single-node k3s, though in a virtual machine; we did not repeat this variant on a bare server for this page.

```sh
curl -sfL https://get.k3s.io | sh -s - --disable traefik
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes
```

Two things to check first:

- k3s ships an ingress that takes ports 80 and 443. `--disable traefik` leaves them free; drop the flag if you want that ingress.
- With a host firewall such as ufw, pods cannot reach the Kubernetes API until the pod and service networks are allowed. See [k3s requirements](https://docs.k3s.io/installation/requirements#operating-systems).

## 2. Install Kamerton

The same as in the [Quick start](./quick-start):

```sh
git clone --branch v0.3.1 https://github.com/kamerton-labs/kamerton.git
cd kamerton
helm install kamerton ./deploy/helm/kamerton \
  --namespace kamerton --create-namespace --dependency-update \
  --set externalURL=http://localhost:8080
kubectl -n kamerton get pods
```

## 3. Set a login

Do this before you open the UI to anyone:

```sh
kubectl -n kamerton create secret generic kamerton-auth \
  --from-literal=username=admin --from-literal=password='<strong password>'
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reset-then-reuse-values \
  --set auth.existingSecret=kamerton-auth
```

## 4. Open the UI from your own computer

Keep the UI on the server's localhost and reach it through SSH. Nothing is opened to the internet.

On the server:

```sh
kubectl -n kamerton port-forward --address 127.0.0.1 svc/kamerton 8080
```

On your computer:

```sh
ssh -N -L 8080:127.0.0.1:8080 user@your-server
```

Then open `http://localhost:8080`. For a permanent address put your web server or an ingress in front, with TLS, and set `externalURL` to that address so links in notifications open.

## 5. Describe a system and connect channels

Continue with the [Quick start](./quick-start#_5-describe-a-system) from step 5, or install the [demo shop](./demo) to see alerts within minutes.

A description may name a Telegram or email receiver before the channel is connected. Since 0.2.1 that receiver is simply left out until you enter the bot token or the mail server under "Channels"; rules and grouping by cause work meanwhile. Since 0.2.2 the Channels screen and the system's card remind you that the channel is not connected.

## Remove everything

```sh
k3d cluster delete kamerton          # the Docker variant
/usr/local/bin/k3s-uninstall.sh      # the host variant
```
