# Уже работающие программы

Если Prometheus, Alertmanager или Grafana в кластере уже работают, Kamerton найдёт их, проверит и подключит. Когда у команд свои Prometheus, заводится несколько наборов программ, и каждая система работает со своим.

## Страница «Состояние Kamerton»

Здесь видны Prometheus, Alertmanager, Grafana, Loki, Tempo и OpenTelemetry Collector, с которыми работает Kamerton, — **набор программ**. Адреса, заданные при установке, образуют основной набор («Основной»).

<Shot name="status" alt="Страница «Состояние Kamerton»: набор «Основной» с шестью программами и набор «Команда Б» с меткой для оператора" caption="Два набора программ. Снимок сделан без кластера, поэтому программы показаны как не подключённые." />

- Любой адрес можно поменять. До сохранения он проверяется: «работает», «не отвечает» или «это не Prometheus». Kamerton отправляет по адресу только запросы GET.
- Адрес основного набора можно вернуть к значению установки.
- Принимаются только адреса http и https, без логина и пароля в адресе.

## Найти установленные

Кнопка «Найти установленные» спрашивает у Kubernetes API список сервисов во всех пространствах имён и ресурсы Prometheus Operator (`Prometheus`, `Alertmanager`). Сеть не сканируется. Каждый кандидат проверяется запросом, найденное можно подставить в набор.

Для этого чарт выдаёт ядру права только на чтение: сервисы (get, list) и ресурсы оператора (get, list). Если они не нужны, выключите поиск: `stacks.discovery.enabled=false`. Адреса по-прежнему можно вписать вручную.

Поиск работает только в кластере. При локальном запуске страница объясняет, почему он недоступен.

## Несколько наборов

Если в компании несколько Prometheus, например по одному на команду, добавьте наборы кнопкой «Добавить набор» и выберите набор для каждой системы: на схеме, в настройках системы, или полем в описании:

```yaml
spec:
  stack: komanda-b   # ID набора со страницы состояния; пусто — основной
```

Всё, что Kamerton читает для системы, берётся из её набора: найденные в телеметрии сервисы, проверка на истории, состояние правил, текущие оповещения и поиск вероятного источника. Неизвестный ID — основной набор и предупреждение. Набор, который использует какая-то система, удалить нельзя.

Наборы хранятся в ConfigMap `kamerton-stacks` (в нём нет ничего секретного), при локальном запуске — в файле `.kamerton-stacks.json` рядом с описаниями. После изменения наборов контроллер заново применяет все системы.

## Метки для Prometheus Operator

Kamerton доставляет правила и маршруты объектами PrometheusRule и AlertmanagerConfig. Чтобы их забрал нужный экземпляр Prometheus Operator, у набора есть метки: они ставятся на PrometheusRule и AlertmanagerConfig систем этого набора. Если ресурс оператора найден, метки заполняются сами по его селекторам.

Два экземпляра под управлением оператора, которые оба выбирают все объекты, метками не разделить. Страница состояния об этом предупреждает.

Попробовать на одном кластере: в [kamerton-labs/examples](https://github.com/kamerton-labs/examples/tree/main/second-prometheus) лежит второй Prometheus, который берёт только правила с меткой `team=b`.

```sh
kubectl apply -f second-prometheus/prometheus.yaml
```

Затем на странице «Состояние Kamerton» нажмите «Найти установленные», отметьте новый Prometheus и создайте из него набор. Система, выбравшая этот набор, получает правила с нужной меткой. Убрать: `kubectl delete namespace team-b`.

## Свой Prometheus с самого начала

Чтобы не ставить встроенный Prometheus и сразу взять свой:

```sh
helm install kamerton ./deploy/helm/kamerton -n kamerton --create-namespace --dependency-update \
  --set image.repository=kamerton --set image.tag=dev \
  --set kube-prometheus-stack.enabled=false \
  --set bringYourOwn.prometheus.enabled=true \
  --set bringYourOwn.prometheus.url=http://prometheus-operated.monitoring:9090 \
  --set bringYourOwn.prometheus.alertmanagerUrl=http://alertmanager-operated.monitoring:9093
```

Эти адреса становятся основным набором. Требования и оговорки:

- В кластере должен работать **Prometheus Operator**. Kamerton не пишет в HTTP API Prometheus и Grafana.
- Если `ruleSelector` или `alertmanagerConfigSelector` вашего оператора требует метки, задайте их у набора на странице состояния.
- Встроенные Collector и Grafana настроены на встроенный Prometheus (`opentelemetry-collector.config.exporters.prometheusremotewrite.endpoint`, `grafana.datasources`). Направьте их на свой или выключите: `opentelemetry-collector.enabled=false`, `grafana.enabled=false`.
- Для Grafana так же работает `bringYourOwn.grafana` (`enabled`, `url`). Панели доставляются как ConfigMap, поэтому вашей Grafana нужен sidecar для панелей.

Все значения чарта — в разделе [Настройки](./configuration).
