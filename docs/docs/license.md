# Licence and third-party programs

## Kamerton

Kamerton is licensed under the **GNU Affero General Public License v3.0 only** (AGPL-3.0-only). The licence text is in [LICENSE](https://github.com/kamerton-labs/kamerton/blob/main/LICENSE) in the repository. Copyright 2026 The Kamerton Authors.

The examples repository, [kamerton-labs/examples](https://github.com/kamerton-labs/examples), uses the same licence. This website is also distributed under AGPL-3.0-only.

## Programs installed by the chart

The Kamerton Helm chart installs these programs as dependencies, from their upstream Helm charts and container images, unmodified. They are separate programs, distributed by their own authors under their own licences. Kamerton only configures them through their public interfaces: Kubernetes resources and HTTP APIs.

| Program | Licence | Installed through the chart |
| --- | --- | --- |
| Prometheus | Apache-2.0 | kube-prometheus-stack (prometheus-community) |
| Prometheus Operator | Apache-2.0 | kube-prometheus-stack (prometheus-community) |
| Alertmanager | Apache-2.0 | kube-prometheus-stack (prometheus-community) |
| OpenTelemetry Collector | Apache-2.0 | opentelemetry-collector (open-telemetry) |
| Grafana | AGPL-3.0 | grafana (grafana-community) |
| Loki | AGPL-3.0 | loki (grafana-community) |
| Tempo | AGPL-3.0 | tempo (grafana-community) |

Chart versions are pinned in `deploy/helm/kamerton/Chart.yaml`. The upstream charts may install further components (for example kube-state-metrics and node-exporter in kube-prometheus-stack); see each chart for its contents and licences.

## Libraries and fonts

Libraries compiled into the binary and the web UI are listed with their versions in `go.mod` / `go.sum` and `web/package.json` / `web/pnpm-lock.yaml`; each keeps its own licence. The web UI bundles shadcn/ui components (MIT) and the Geist font (SIL Open Font License 1.1).

This website is built with VitePress (MIT) and uses the Geist and Geist Mono fonts (SIL Open Font License 1.1).

The full list is in the [NOTICE](https://github.com/kamerton-labs/kamerton/blob/main/NOTICE) file in the repository.

## Contributing

How to propose changes: [CONTRIBUTING.md](https://github.com/kamerton-labs/kamerton/blob/main/CONTRIBUTING.md). Contributions need a signed-off commit and agreement to a contributor licence agreement (CLA). Code of conduct: [CODE_OF_CONDUCT.md](https://github.com/kamerton-labs/kamerton/blob/main/CODE_OF_CONDUCT.md).
