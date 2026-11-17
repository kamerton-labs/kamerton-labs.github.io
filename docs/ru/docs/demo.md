# Демо-магазин

Проще всего увидеть Kamerton в работе рядом с [OpenTelemetry Demo](https://github.com/open-telemetry/opentelemetry-demo) — открытым магазином примерно из пятнадцати сервисов, в котором можно включать сбои. Kamerton проверялся именно на нём: правила срабатывают на встроенных сценариях сбоев демо.

Все файлы — в репозитории [kamerton-labs/examples](https://github.com/kamerton-labs/examples). Секретов там нет, ID чатов и адреса почты в описаниях — заглушки.

## Что нужно

Небольшой кластер Kubernetes (kind, k3s, colima), `kubectl`, `helm` и `docker`. Склонируйте оба репозитория рядом:

```sh
git clone https://github.com/kamerton-labs/kamerton.git
git clone https://github.com/kamerton-labs/examples.git
cd kamerton
```

## 1. Поставить Kamerton со всеми программами

```sh
docker build -t kamerton:dev .
# сделать образ доступным кластеру, например:
#   kind load docker-image kamerton:dev
helm install kamerton ./deploy/helm/kamerton -n kamerton --create-namespace \
  --dependency-update -f ../examples/otel-demo/values-kamerton.yaml
```

`values-kamerton.yaml` берёт локально собранный образ и задаёт `externalURL: http://localhost:8080`, чтобы ссылки в оповещениях вели на port-forward. Если открываете Kamerton через ingress, поменяйте адрес.

## 2. Поставить магазин

Собственные хранилища демо выключены, вся телеметрия идёт в Collector Kamerton:

```sh
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm upgrade --install otel-demo open-telemetry/opentelemetry-demo \
  --version 0.42.6 -n otel-demo --create-namespace \
  -f ../examples/otel-demo/values-demo.yaml
```

## 3. Описать магазин и открыть интерфейс

```sh
kubectl -n kamerton apply -f ../examples/otel-demo/system.yaml
kubectl -n kamerton port-forward svc/kamerton 8080
```

Интерфейс — по адресу `http://localhost:8080`. Подключите Telegram или почту на экране «Каналы» (см. [Оповещения](./notifications)), либо замените в `system.yaml` ID чата и адреса-заглушки на свои.

## 4. Сломать что-нибудь

В магазине есть флаги сбоев. Откройте страницу флагов:

```sh
kubectl -n otel-demo port-forward svc/frontend-proxy 8081:8080
```

Флаги — по адресу `http://localhost:8081/feature`. Включите, например, `paymentFailure`. Через несколько минут оповещение появится в разделе «Оповещения» и в подключённом канале. В интерфейсе видна и цепочка затронутых сервисов с вероятным источником: Kamerton проходит по связям `dependsOn`.

## Что в описании магазина

Описание демо — хороший образец полного описания: имена метрик в `telemetry`, короткое окно и короткие `for`, чтобы оповещение приходило за несколько минут, свои пороги для операций оформления заказа и оплаты, цели доступности, очередь `orders` в Kafka с двумя группами потребителей.

[otel-demo/system.yaml](https://github.com/kamerton-labs/examples/blob/main/otel-demo/system.yaml)
