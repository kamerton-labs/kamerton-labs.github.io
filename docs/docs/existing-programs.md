# Programs you already run

If Prometheus, Alertmanager or Grafana already run in the cluster, Kamerton finds them, checks them and connects them. When teams have their own Prometheus, you add several sets of programs and each system works with its own.

## The Kamerton status page

The "Kamerton status" page shows the Prometheus, Alertmanager, Grafana, Loki, Tempo and OpenTelemetry Collector that Kamerton uses - a **set of programs**. The addresses given at install time form the built-in set, "Main".

<Shot name="status" alt="Kamerton status page: the main set with six programs and a second set with one operator label" caption="Two sets of programs. Taken without a cluster, so the programs show as not connected." />

- Every address can be changed. It is checked before saving: works, does not answer, or "this is not Prometheus". Kamerton sends only GET requests to the address.
- An address of the built-in set can be reset to the install-time value.
- Only http and https addresses are accepted, with no credentials in the address.

## Find installed programs

"Find installed" asks the Kubernetes API for Services in all namespaces and Prometheus Operator resources (`Prometheus`, `Alertmanager`). The network is not scanned. Each candidate is confirmed with an HTTP check, and a found program can be put into a set.

For this the chart grants the core read-only access: Services (get, list) and the operator resources (get, list). If you do not want that, turn it off with `stacks.discovery.enabled=false`; addresses can still be typed in by hand.

Discovery works only in a cluster. When run locally, the page explains why it is unavailable.

## Several sets

A company with several Prometheus instances, for example one per team, adds sets with "Add set" and picks a set per system: on the canvas, in the system's settings, or with a field in the description:

```yaml
spec:
  stack: komanda-b   # set ID from the status page; empty: the built-in set
```

Everything Kamerton reads for a system comes from its set: services discovered in telemetry, backtest, rule states, active alerts and the probable-source search. An unknown ID falls back to the built-in set with a warning. A set used by a system cannot be deleted.

Sets live in the ConfigMap `kamerton-stacks` (nothing secret), or locally in `.kamerton-stacks.json` next to the descriptions. A change of the sets makes the controller reconcile every system again.

## Labels for the Prometheus Operator

Kamerton delivers rules and routes as PrometheusRule and AlertmanagerConfig objects. So that the right Prometheus Operator instance picks them up, a set carries labels that go on the PrometheusRule and AlertmanagerConfig of its systems. When the operator resource is found, the labels are filled from its selectors.

Two operator-managed instances that both select every object cannot be separated by labels. The status page says so.

To try it on one cluster, [kamerton-labs/examples](https://github.com/kamerton-labs/examples/tree/main/second-prometheus) has a second Prometheus that takes only rules labelled `team=b`:

```sh
kubectl apply -f second-prometheus/prometheus.yaml
```

Then open "Kamerton status", press "Find installed", tick the new Prometheus and create a set from it. A system that picks this set gets its rules labelled so that only this Prometheus loads them. `kubectl delete namespace team-b` removes it.

## Your own Prometheus from the start

To skip the bundled Prometheus and use yours:

```sh
helm install kamerton ./deploy/helm/kamerton -n kamerton --create-namespace --dependency-update \
  --set kube-prometheus-stack.enabled=false \
  --set bringYourOwn.prometheus.enabled=true \
  --set bringYourOwn.prometheus.url=http://prometheus-operated.monitoring:9090 \
  --set bringYourOwn.prometheus.alertmanagerUrl=http://alertmanager-operated.monitoring:9093
```

These addresses become the built-in set. Requirements and caveats:

- Your cluster must run the **Prometheus Operator**. Kamerton does not push to Prometheus' or Grafana's HTTP APIs.
- If your operator's `ruleSelector` or `alertmanagerConfigSelector` needs labels, set them on the set on the status page.
- The bundled Collector and Grafana are pre-wired to the bundled Prometheus (`opentelemetry-collector.config.exporters.prometheusremotewrite.endpoint`, `grafana.datasources`). Point them at yours or disable them: `opentelemetry-collector.enabled=false`, `grafana.enabled=false`.
- `bringYourOwn.grafana` (`enabled`, `url`) works the same way for Grafana. Dashboards are delivered as ConfigMaps, so your Grafana needs the dashboard sidecar.

All chart values: [Configuration](./configuration).
