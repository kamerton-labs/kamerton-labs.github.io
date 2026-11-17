# Быстрый старт

От сборки образа до первого описания системы в кластере Kubernetes. Программы наблюдения ставятся вместе с Kamerton.

::: warning Готового образа пока нет
Образ Kamerton и репозиторий чартов ещё не опубликованы. Образ собирается из исходников, чарт ставится из клона репозитория.
:::

## Что нужно

- Кластер Kubernetes 1.27 или новее и `kubectl`. Проверено на одноузловом k3s.
- Helm. Чарт apiVersion v2, проверено с Helm 4.3.
- Docker или другой сборщик OCI-образов.
- Клон репозитория:

```sh
git clone https://github.com/kamerton-labs/kamerton.git
cd kamerton
```

## 1. Собрать образ

```sh
docker build -t kamerton:dev .
```

Сделайте образ доступным кластеру, например:

```sh
kind load docker-image kamerton:dev                        # kind
docker save kamerton:dev | sudo k3s ctr images import -    # k3s
```

Или загрузите образ в свой registry и укажите это имя в следующем шаге.

## 2. Поставить через Helm

```sh
helm install kamerton ./deploy/helm/kamerton \
  --namespace kamerton --create-namespace --dependency-update \
  --set image.repository=kamerton --set image.tag=dev \
  --set externalURL=http://localhost:8080
```

Ставятся ядро Kamerton (Deployment, Service, RBAC, CRD) и программы наблюдения как зависимости чарта с зафиксированными версиями: kube-prometheus-stack (Prometheus Operator, Prometheus, Alertmanager), Grafana, Loki, Tempo и OpenTelemetry Collector. Флаг `--dependency-update` скачивает эти чарты, `helm repo add` не нужен.

`externalURL` — адрес, по которому люди открывают интерфейс. На него ведут ссылки в оповещениях. Без него ссылок в оповещениях нет: внутренние адреса кластера с телефона не открываются.

Все настройки чарта — в разделе [Настройки](./configuration).

## 3. Открыть интерфейс

```sh
kubectl -n kamerton port-forward svc/kamerton 8080
```

Затем откройте `http://localhost:8080`.

## 4. Включить вход

Сразу после установки интерфейс и API открыты всем, кто может до них достучаться. На экране «Каналы» об этом предупреждает красная плашка. Включите вход, прежде чем открывать интерфейс шире, чем через port-forward:

```sh
kubectl -n kamerton create secret generic kamerton-auth \
  --from-literal=username=admin --from-literal=password='<надёжный пароль>'
helm upgrade kamerton ./deploy/helm/kamerton -n kamerton --reuse-values \
  --set auth.existingSecret=kamerton-auth
```

Как устроен вход и чего он не умеет — в разделе [Безопасность](./security).

## 5. Описать систему

В интерфейсе нажмите «Добавить систему» и добавьте сервисы на схеме. Сервисы, которые уже присылают телеметрию, добавляются одним нажатием. Или примените готовый файл описания:

```sh
kubectl -n kamerton apply -f https://raw.githubusercontent.com/kamerton-labs/examples/main/otel-demo/system.yaml
kubectl -n kamerton get systemdescriptions
```

Описания, которые отправляют оповещения, должны лежать в пространстве имён Kamerton: AlertmanagerConfig ссылается только на Secret из своего пространства имён.

Формат описания — в разделе [Описание системы](./describe-system).

## 6. Подключить Telegram или почту

Откройте «Каналы» в меню, вставьте токен бота или данные почтового сервера, добавьте получателей. Подробно — в разделе [Оповещения](./notifications).

## Что дальше

- [Демо-магазин](./demo): Kamerton рядом с OpenTelemetry Demo, включаемые сбои и первое оповещение.
- [Уже работающие программы](./existing-programs): свой Prometheus вместо встроенного, несколько наборов программ.
- [Ограничения и статус](./limitations): что пока не сделано.

## Запуск без кластера

Ядро и интерфейс можно запустить на своём компьютере, например чтобы посмотреть интерфейс или проверить описание. Нужны Go 1.25, Node 24, pnpm 12 и make.

```sh
make run    # собирает интерфейс и ядро, слушает :8080 с описанием OTel Demo
```

Без адресов Prometheus, Alertmanager и Grafana обнаружение сервисов, проверка на истории, оповещения и состояние программ честно сообщают «не настроено». Адреса задаются флагами `--prometheus-url`, `--alertmanager-url`, `--grafana-url` или на странице «Состояние Kamerton». Описания систем хранятся в файлах. Каналы Telegram и почты и поиск установленных программ работают только в кластере.

Проверить описание и посмотреть, какие правила из него получатся, можно из командной строки:

```sh
bin/kamerton validate -f system.yaml
bin/kamerton generate -f system.yaml            # файл правил в stdout
bin/kamerton generate -f system.yaml -o out/    # правила, панель, инструкции
bin/kamerton schema > systemdescription.schema.json
```
