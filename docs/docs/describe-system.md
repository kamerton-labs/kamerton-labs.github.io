# Describe a system

Everything Kamerton needs to know about one system is one YAML document. In a cluster it is a `SystemDescription` resource (`kamerton.dev/v1alpha1`); locally it is a file. The UI edits the same text: the canvas, the rule cards and YAML mode all show one document.

## The shortest description

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

From these lines Kamerton generates rules for both services: errors, latency, requests stopped arriving, memory and restarts. Default thresholds can be changed for the whole system or for one service.

There can be several systems, each with its own document. Telegram and email channels are shared by all systems; receivers and routes belong to each system.

## What `spec` contains

| Field | What it sets |
| --- | --- |
| `environment` | Environment name, for example `demo`. Added as the `environment` label to every alert. |
| `stack` | The set of programs the system uses. Empty: the built-in set. See [Programs you already run](./existing-programs). |
| `telemetry` | Metric and label names in your Prometheus. Defaults follow the OpenTelemetry span metrics connector and cAdvisor. |
| `defaults` | Policies for every service: namespace, window, thresholds. |
| `services` | The services of the system. At least one. |
| `notifications` | Receivers, routes, language and time zone of messages. See [Notifications](./notifications). |

## A service

| Field | What it sets |
| --- | --- |
| `name` | Unique name: lowercase letters, digits and dashes. |
| `type` | `http`, `grpc`, `queue` or `database`. |
| `critical` | Critical services page on call; others create warnings. |
| `description`, `owner` | Short description and who is responsible. The description shows in the UI and in notifications. |
| `telemetryName` | The service name in telemetry, if it differs from `name`. |
| `dependsOn` | Services this service calls. Used for the canvas and to find the probable source of an incident. |
| `workload` | Where the pods run: `namespace` and `podRegex`. |
| `errorRate`, `latency`, `saturation`, `trafficDrop` | Own thresholds instead of the defaults. |
| `operations` | Operations with their own error and latency thresholds. |
| `excludeOperations` | Operations the rules ignore (RE2 regular expressions). |
| `queue` | For `queue` services: topic, consumer groups, allowed lag. |
| `slo` | Availability objective in percent and its window. |
| `customRules` | Your own rules for what the library does not cover. |
| `runbookURL` | Link to your own runbook. Without it Kamerton generates a stub. |

## Defaults and per-service thresholds

Everything in `defaults` applies to every service unless the service sets its own:

```yaml
spec:
  defaults:
    namespace: otel-demo
    rateWindow: 2m
    excludeOperations:
      - 'flagd\.evaluation\.v2\.Service/EventStream'   # noisy streaming call
    errorRate:
      threshold: 0.05            # 5% failed calls
      minRequestsPerSecond: 0.05 # do not page on one failure in an idle service
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
        thresholdMs: 1500        # own threshold for this service
```

`rateWindow` is the window for `rate()` and `increase()`. It must cover at least two samples: with metrics updated once a minute use 2m or more. A window below 2m raises a warning.

`for` is how long the condition must hold before the rule fires.

## Operations

Errors and latency are checked for the service as a whole and for every operation separately. An important operation can have its own threshold:

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

An operation with its own policy is left out of the shared per-operation rule.

## Queues

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

An empty `consumerGroups` means all groups of the topic.

## Your own rules

When the library is not enough, a service can carry its own rule: a condition assembled from parts, or a PromQL expression. Exactly one of the two.

```yaml
customRules:
  - name: queue-size
    title: Job queue is growing
    condition:
      metric: jobs_waiting
      aggregation: max       # max, min, avg, sum or count
      operator: gt           # gt, gte, lt, lte, eq, ne
      threshold: 500
    for: 5m
    unit: jobs
```

Custom rules get the same labels, notification text and runbook link as built-in ones. In the UI they are easier to create on the Rules tab, where fields are checked as you type.

## Metric names

Nothing is tied to the demo: metric and label names are set in `spec.telemetry`.

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

These are the defaults. If your Prometheus names things differently, change them here.

## Validation

A description is checked against the JSON Schema and by semantic checks: an unknown service in `dependsOn`, a malformed duration, a reference to a Secret that is not allowed. In the UI errors show next to the field. From the command line:

```sh
bin/kamerton validate -f system.yaml
bin/kamerton schema > systemdescription.schema.json   # schema for your editor
```

## Positions on the canvas

The coordinates of blocks on the canvas live in the `kamerton.dev/layout` annotation in `metadata`. They do not affect the rules. A description without them is arranged automatically.

A complete example: the demo shop description in [kamerton-labs/examples](https://github.com/kamerton-labs/examples/blob/main/otel-demo/system.yaml).
