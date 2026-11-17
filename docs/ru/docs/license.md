# Лицензия и сторонние программы

## Kamerton

Kamerton распространяется по лицензии **GNU Affero General Public License v3.0 only** (AGPL-3.0-only). Текст лицензии — в [LICENSE](https://github.com/kamerton-labs/kamerton/blob/main/LICENSE) в репозитории. Copyright 2026 The Kamerton Authors.

Репозиторий примеров [kamerton-labs/examples](https://github.com/kamerton-labs/examples) — под той же лицензией. Этот сайт тоже распространяется по AGPL-3.0-only.

## Программы, которые ставит чарт

Helm-чарт Kamerton ставит эти программы как зависимости — из их собственных Helm-чартов и образов, без изменений. Это отдельные программы, которые распространяют их авторы по своим лицензиям. Kamerton только настраивает их через открытые интерфейсы: ресурсы Kubernetes и HTTP API.

| Программа | Лицензия | Ставится через чарт |
| --- | --- | --- |
| Prometheus | Apache-2.0 | kube-prometheus-stack (prometheus-community) |
| Prometheus Operator | Apache-2.0 | kube-prometheus-stack (prometheus-community) |
| Alertmanager | Apache-2.0 | kube-prometheus-stack (prometheus-community) |
| OpenTelemetry Collector | Apache-2.0 | opentelemetry-collector (open-telemetry) |
| Grafana | AGPL-3.0 | grafana (grafana-community) |
| Loki | AGPL-3.0 | loki (grafana-community) |
| Tempo | AGPL-3.0 | tempo (grafana-community) |

Версии чартов зафиксированы в `deploy/helm/kamerton/Chart.yaml`. Исходные чарты могут ставить и другие компоненты (например, kube-state-metrics и node-exporter в kube-prometheus-stack) — их состав и лицензии смотрите в каждом чарте.

## Библиотеки и шрифты

Библиотеки, которые входят в программу и интерфейс, перечислены с версиями в `go.mod` / `go.sum` и `web/package.json` / `web/pnpm-lock.yaml`; у каждой своя лицензия. В интерфейс входят компоненты shadcn/ui (MIT) и шрифт Geist (SIL Open Font License 1.1).

Сайт собран на VitePress (MIT) и использует шрифты Geist и Geist Mono (SIL Open Font License 1.1).

Полный список — в файле [NOTICE](https://github.com/kamerton-labs/kamerton/blob/main/NOTICE) в репозитории.

## Участие

Как предложить изменения — в [CONTRIBUTING.md](https://github.com/kamerton-labs/kamerton/blob/main/CONTRIBUTING.md): нужны коммиты с Signed-off-by и согласие с соглашением о передаче прав (CLA). Правила общения — в [CODE_OF_CONDUCT.md](https://github.com/kamerton-labs/kamerton/blob/main/CODE_OF_CONDUCT.md).
