# Настройки

Главное из значений Helm-чарта и флагов ядра. Полный список с комментариями — в [values.yaml](https://github.com/kamerton-labs/kamerton/blob/main/deploy/helm/kamerton/values.yaml).

Секреты — токен бота Telegram, пароль SMTP, пароль администратора Grafana — в values не задаются никогда. См. [Безопасность](./security).

## Ядро Kamerton

| Значение | По умолчанию | Что задаёт |
| --- | --- | --- |
| `image.repository`, `image.tag` | `ghcr.io/kamerton-labs/kamerton`, версия чарта | Образ ядра. Готовый образ пока не опубликован: соберите свой и укажите его. |
| `replicaCount` | `1` | Число реплик. Больше одной — только с `controller.leaderElect=true`. |
| `controller.enabled` | `true` | Контроллер, который применяет описания систем. |
| `controller.leaderElect` | `false` | Выбор лидера; нужен при нескольких репликах. Опрос Telegram идёт только на лидере. |
| `controller.watchNamespace` | пусто | Пространство имён, где искать описания. Пусто — все. |
| `externalURL` | пусто | Адрес интерфейса, как его открывают люди. На него ведут ссылки в оповещениях; пусто — ссылок нет. |
| `descriptionName` | пусто | Какое описание открывать через старый API одного описания, если их несколько. |
| `logLevel` | `info` | Уровень логов. |
| `service.type`, `service.port` | `ClusterIP`, `8080` | Service ядра. |
| `resources` | запрос 50m CPU и 64Mi, лимит 256Mi | Ресурсы ядра. |

Ядро работает без прав root, с корневой файловой системой только для чтения, без повышения привилегий и со сброшенными возможностями Linux (`podSecurityContext`, `securityContext`).

## Каналы

| Значение | По умолчанию | Что задаёт |
| --- | --- | --- |
| `telegram.uiSetup` | `true` | Дать ядру доступ к Secret с токеном бота. `false` — Secret ведёте сами, интерфейс токены не сохраняет. |
| `telegram.secretName` | `kamerton-telegram` | Secret с токеном (ключ `bot-token`). |
| `email.uiSetup` | `true` | То же для пароля SMTP. |
| `email.secretName` | `kamerton-smtp` | Secret с паролем SMTP (ключ `password`). |

## Вход

| Значение | По умолчанию | Что задаёт |
| --- | --- | --- |
| `auth.existingSecret` | пусто | Secret с ключами `username`, `password` и по желанию `session-secret`. Предпочтительный способ. |
| `auth.username`, `auth.password` | пусто | Чарт сам создаёт Secret из этих значений. Пароль останется в записи релиза Helm. |

Вход выключен, пока не задано одно из двух.

## Наборы программ

| Значение | По умолчанию | Что задаёт |
| --- | --- | --- |
| `stacks.configMapName` | `kamerton-stacks` | ConfigMap, где хранятся наборы. |
| `stacks.discovery.enabled` | `true` | «Найти установленные»: права на чтение сервисов и ресурсов Prometheus Operator. |
| `endpoints.*` | адреса встроенных программ | Адреса Prometheus, Alertmanager, Grafana, Loki, Tempo и проверки Collector — основной набор. |
| `bringYourOwn.prometheus.enabled`, `url`, `alertmanagerUrl` | выключено | Свой Prometheus и Alertmanager вместо встроенных. Выключите `kube-prometheus-stack.enabled`. |
| `bringYourOwn.grafana.enabled`, `url` | выключено | Своя Grafana. Выключите `grafana.enabled`. |

## Встроенные программы

Ставятся из своих чартов с версиями, зафиксированными в `Chart.yaml`. У каждой есть `<имя>.enabled`.

| Значение | Что важно |
| --- | --- |
| `kube-prometheus-stack` | Prometheus проверяет правила каждые 15 секунд (`evaluationInterval: 15s`), хранит данные 15 дней (`retention: 15d`), принимает remote write от Collector. Alertmanager берёт AlertmanagerConfig с меткой `kamerton.dev/managed: "true"`. |
| `grafana` | Пароль администратора чарт создаёт сам в Secret `kamerton-grafana`. Источники данных — встроенные Prometheus, Loki и Tempo. Панели подхватываются из ConfigMap с меткой `grafana_dashboard`. |
| `loki` | Один экземпляр, хранение в файловой системе. |
| `tempo` | Настройки чарта по умолчанию. |
| `opentelemetry-collector` | Принимает OTLP. Трассы — в Tempo, метрики по трассам (spanmetrics, сброс каждые 15 секунд) — в Prometheus, логи — в Loki. |

## Флаги ядра

Нужны при запуске без Helm, например локально. У каждого флага есть переменная окружения `KAMERTON_*`.

| Флаг | Что задаёт |
| --- | --- |
| `--description` | Файлы описаний через запятую или каталог (новые системы создаются в нём). Локальный режим. |
| `--listen-address` | Адрес интерфейса и API, по умолчанию `:8080`. |
| `--prometheus-url`, `--alertmanager-url`, `--grafana-url` | Адреса программ. Без них обнаружение, проверка на истории, оповещения и состояние программ сообщают «не настроено». |
| `--loki-url`, `--tempo-url`, `--otel-collector-health-url` | Адреса для страницы состояния. |
| `--external-url` | Адрес интерфейса для ссылок в оповещениях. |
| `--stacks-file` | Файл наборов программ в локальном режиме. По умолчанию `.kamerton-stacks.json` рядом с описаниями. |
| `--env-file` | Файл с переменными `KAMERTON_*`, по умолчанию `.env`. Уже заданные переменные окружения важнее. |
| `--enable-controller`, `--leader-elect`, `--watch-namespace` | Контроллер Kubernetes. |
| `--log-level` | `debug`, `info`, `warn`, `error`. |

Переменные входа: `KAMERTON_AUTH_USER`, `KAMERTON_AUTH_PASSWORD`, по желанию `KAMERTON_AUTH_SECRET`.

## Командная строка

```sh
kamerton serve                      # ядро и интерфейс
kamerton validate -f system.yaml    # проверить описание
kamerton generate -f system.yaml    # правила в stdout; -o каталог — правила, панель, инструкции
kamerton schema                     # JSON Schema описания
```
