# Описание системы

Вся настройка Kamerton для одной системы — один документ YAML. В кластере это ресурс `SystemDescription` (`kamerton.dev/v1alpha1`), локально — файл. Интерфейс редактирует тот же текст: схема, карточки правил и режим YAML показывают один документ.

## Самое короткое описание

```yaml
apiVersion: kamerton.dev/v1alpha1
kind: SystemDescription
metadata:
  name: shop
spec:
  services:
    - name: checkout
      type: grpc
      critical: true
      dependsOn: [payment]
    - name: payment
      type: grpc
```

Из этих строк Kamerton создаёт правила для обоих сервисов: ошибки, медленные ответы, остановка потока запросов, память и перезапуски. Пороги по умолчанию можно поменять для всей системы или для отдельного сервиса.

Систем может быть несколько, у каждой свой документ. Каналы Telegram и почты общие для всех систем, а получатели и маршруты у каждой системы свои.

## Из чего состоит `spec`

| Поле | Что задаёт |
| --- | --- |
| `environment` | Название окружения, например `demo`. Добавляется меткой `environment` ко всем оповещениям. |
| `stack` | Набор программ, с которым работает система. Пусто — основной набор. См. [Уже работающие программы](./existing-programs). |
| `telemetry` | Имена метрик и меток в вашем Prometheus. По умолчанию — как у OpenTelemetry span metrics connector и cAdvisor. |
| `defaults` | Правила по умолчанию для всех сервисов: пространство имён, окно, пороги. |
| `services` | Сервисы системы. Хотя бы один. |
| `notifications` | Получатели, маршруты, язык и часовой пояс сообщений. См. [Оповещения](./notifications). |

## Сервис

| Поле | Что задаёт |
| --- | --- |
| `name` | Уникальное имя: строчные латинские буквы, цифры и дефис. |
| `type` | `http`, `grpc`, `queue` или `database`. |
| `critical` | Важный сервис: его оповещения критичные, остальные — предупреждения. |
| `description`, `owner` | Короткое описание и ответственный. Описание видно в интерфейсе и в сообщениях. |
| `telemetryName` | Имя сервиса в телеметрии, если оно отличается от `name`. |
| `dependsOn` | Сервисы, которые этот сервис вызывает. По ним строится схема и ищется вероятный источник сбоя. |
| `workload` | Где работают поды: `namespace` и `podRegex`. |
| `errorRate`, `latency`, `saturation`, `trafficDrop` | Свои пороги вместо порогов по умолчанию. |
| `operations` | Операции со своими порогами ошибок и задержки. |
| `excludeOperations` | Операции, которые правила не учитывают (регулярные выражения RE2). |
| `queue` | Для сервисов типа `queue`: топик, группы потребителей, допустимое отставание. |
| `slo` | Цель доступности в процентах и окно. |
| `customRules` | Свои правила для того, что не покрывает библиотека. |
| `runbookURL` | Ссылка на свою инструкцию. Без неё Kamerton создаёт заготовку. |

## Пороги по умолчанию и для сервиса

Всё, что задано в `defaults`, действует на все сервисы, пока сервис не задаст своё:

```yaml
spec:
  defaults:
    namespace: otel-demo
    rateWindow: 2m
    excludeOperations:
      - 'flagd\.evaluation\.v2\.Service/EventStream'   # шумный потоковый вызов
    errorRate:
      threshold: 0.05            # 5% ошибочных запросов
      minRequestsPerSecond: 0.05 # не срабатывать на одной ошибке в тихом сервисе
      for: 1m
    latency:
      quantile: 0.95
      thresholdMs: 1000
      for: 2m
    saturation:
      maxRestartsPerHour: 3
      for: 2m
  services:
    - name: frontend
      type: http
      critical: true
      latency:
        thresholdMs: 1500        # свой порог для этого сервиса
```

`rateWindow` — окно для `rate()` и `increase()`. Оно должно захватывать хотя бы два замера: если метрики обновляются раз в минуту, берите 2m или больше. Окно меньше 2m даёт предупреждение.

`for` — сколько условие должно держаться, прежде чем правило сработает.

## Операции

Ошибки и задержка проверяются и по сервису в целом, и по каждой операции отдельно. Для важной операции можно задать свой порог:

```yaml
- name: checkout
  type: grpc
  critical: true
  errorRate:
    perOperation: true
  operations:
    - name: oteldemo.CheckoutService/PlaceOrder
      errorRate:
        threshold: 0.01
        minRequestsPerSecond: 0.01
  slo:
    objective: 99.5
    window: 30d
```

Операция со своими порогами исключается из общего правила «в каждой операции».

## Очереди

```yaml
- name: orders
  type: queue
  workload:
    podRegex: 'kafka-.*'
  queue:
    topic: orders
    consumerGroups: [fraud-detection, accounting]
    maxLag: 100
    for: 2m
```

Пустой `consumerGroups` значит все группы топика.

## Свои правила

Если библиотеки не хватает, у сервиса можно описать своё правило: собрать условие из частей или написать выражение PromQL. Ровно одно из двух.

```yaml
customRules:
  - name: queue-size
    title: Очередь задач растёт
    condition:
      metric: jobs_waiting
      aggregation: max       # max, min, avg, sum или count
      operator: gt           # gt, gte, lt, lte, eq, ne
      threshold: 500
    for: 5m
    unit: шт
```

Свои правила получают те же метки, текст оповещения и ссылку на инструкцию, что и встроенные. В интерфейсе их удобнее создавать на вкладке «Правила»: поля проверяются сразу.

## Имена метрик

Ничего не привязано к демо: имена метрик и меток задаются в `spec.telemetry`.

```yaml
spec:
  telemetry:
    spans:
      callsMetric: traces_span_metrics_calls_total
      durationBucketMetric: traces_span_metrics_duration_milliseconds_bucket
      durationUnit: ms
      serviceLabel: service_name
      operationLabel: span_name
    containers:
      memoryMetric: container_memory_working_set_bytes
      cpuMetric: container_cpu_usage_seconds_total
    queues:
      lagMetric: kafka_consumer_group_lag_ratio
```

Здесь показаны значения по умолчанию. Если в вашем Prometheus метрики называются иначе, поменяйте их здесь.

## Проверка описания

Описание проверяется по JSON Schema и смысловым правилам: неизвестный сервис в `dependsOn`, неверная длительность, ссылка на чужой Secret. Ошибки видны прямо в интерфейсе у поля. Из командной строки:

```sh
bin/kamerton validate -f system.yaml
bin/kamerton schema > systemdescription.schema.json   # схема для редактора
```

## Положение сервисов на схеме

Координаты блоков на схеме хранятся в аннотации `kamerton.dev/layout` в `metadata`. На правила они не влияют. Описание без них раскладывается автоматически.

Полный пример — описание демо-магазина в [kamerton-labs/examples](https://github.com/kamerton-labs/examples/blob/main/otel-demo/system.yaml).
