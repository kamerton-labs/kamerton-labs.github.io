---
layout: home
markdownStyles: false
title: Kamerton — правила и оповещения для сервисов в Kubernetes по их описанию
titleTemplate: false
description: Kamerton ставит Prometheus, Alertmanager, Grafana, Loki, Tempo и OpenTelemetry Collector одной командой Helm и пишет для них правила и маршруты оповещений по короткому описанию системы.
---

<div class="k-home">

<header class="k-top">

# Kamerton настраивает наблюдение за сервисами в Kubernetes по их короткому описанию

Вы перечисляете сервисы, их тип и зависимости. Kamerton ставит Prometheus, Alertmanager, Grafana, Loki, Tempo и OpenTelemetry Collector из их собственных чартов, пишет правила оповещений и маршруты в Telegram и на почту, а потом следит, чтобы они не расходились с описанием. Ниже настоящий кусок описания демо-магазина и одно из правил, которое Kamerton из него сделал.

<p class="k-meta">Версия 0.1.0, ранняя. Лицензия AGPL-3.0. <a href="/ru/docs/quick-start">Быстрый старт</a> · <a href="https://github.com/kamerton-labs/kamerton">Код на GitHub</a></p>

</header>

<div class="k-pair k-wide">
<div class="k-pair__side vp-doc">

<p class="k-file">testdata/otel-demo/system.yaml, начало</p>

```yaml
kind: SystemDescription
metadata:
  name: otel-demo
spec:
  environment: demo
  defaults:
    namespace: otel-demo
    rateWindow: 2m
    errorRate:
      threshold: 0.05
      minRequestsPerSecond: 0.05
      for: 1m
  services:
    - name: checkout
      type: grpc
      critical: true
      dependsOn: [cart, currency, email, payment, …]
    # … ещё 15 сервисов и получатели оповещений
```

</div>
<div class="k-pair__side vp-doc">

<p class="k-file">kamerton generate -f system.yaml, одно правило из 164</p>

```yaml
- alert: KamertonErrorRateHigh
  expr: |-
    (
    (
      sum by (service_name) (rate(traces_span_metrics_calls_total{service_name="checkout", …, status_code="STATUS_CODE_ERROR"}[2m]))
    /
      sum by (service_name) (rate(traces_span_metrics_calls_total{service_name="checkout", …}[2m]))
    ) > 0.05
    )
    and on (service_name)
    (
      sum by (service_name) (rate(traces_span_metrics_calls_total{service_name="checkout", …}[2m])) > 0.05
    )
  for: 1m
  labels:
    service: checkout
    severity: critical
    # …
  annotations:
    kamerton_title: Много ошибочных запросов
    kamerton_threshold: 5%
```

<p class="k-file">Когда оно сработает, в Telegram придёт</p>

<div class="k-msg" role="group" aria-label="Пример сообщения в Telegram">
<p><span class="k-msg__dot" aria-hidden="true"></span><b>Критично</b> · otel-demo (demo)</p>
<p><span class="k-msg__dot" aria-hidden="true"></span><b>checkout</b>: Много ошибочных запросов<br>сейчас <b>12.3%</b>, порог 5% · с 09:18 16.11 UTC+5<br><span class="k-msg__link">Открыть в Kamerton</span></p>
</div>

</div>
</div>

Для 16 сервисов демо получается 164 правила. Почти все пороги в них взяты из `defaults`, а своё значение задаётся только там, где оно нужно: у операции `Charge` сервиса `payment` порог ошибок 1%. Значение и время в сообщении взяты для примера, слова те же, что в шаблоне.

## Схему, список правил и YAML можно править вперемешку

<ThreeViews class="k-wide" />

Это три вида одного описания. Сервис, добавленный на схеме, сразу появляется в YAML. Порог, изменённый в карточке правила, меняет только это место в тексте, и комментарии вокруг остаются на месте. Снимки сделаны на интерфейсе, запущенном локально без кластера, поэтому у правил стоит «нет данных». Интерфейс пока только на русском.

## Что происходит между сбоем и сообщением

Сервис ничего не знает о Kamerton. Он отправляет телеметрию в Collector, дальше работают обычные программы, а Kamerton отвечает за то, что в них записано.

<SignalPath class="k-wide" />

## Какие правила получатся

Библиотека правил покрывает запросы, ресурсы подов, очереди и цель доступности. Для каждого сервиса `http` или `grpc` Kamerton проверяет долю ошибок и время ответа, отдельно по сервису и по каждой его операции, чтобы сбой редкой операции не утонул в общем потоке. Для подов есть память, процессор, перезапуски и OOMKilled. Для очередей отставание группы потребителей. Если задана цель доступности, добавляются правила скорости расхода бюджета ошибок.

Правила ошибок не срабатывают на одной ошибке в тихом сервисе: им нужен минимальный поток запросов. Правилам задержки хватает трёх запросов за окно, поэтому заказы, которых две штуки в минуту, тоже проверяются.

### Правила без порогов

Часть правил сравнивает сервис с ним самим. «Замедление относительно обычного» срабатывает, когда время ответа выросло в пять раз против прошлого часа. «Запросы перестали поступать» ловит сервис, до которого никто не может достучаться: ошибок он не пишет, просто поток падает ниже 10% от среднего за сутки. «Очередь перестали читать» смотрит, двигается ли смещение группы. Память у лимита считается по тренду за час. Пока истории мало, такие правила молчат.

Перед тем как включить правило или сдвинуть порог, в карточке правила видно, сколько раз оно сработало бы за последние день, три или семь дней на данных, которые уже лежат в Prometheus. Полный список с полями и значениями по умолчанию в [библиотеке правил](/ru/docs/rules).

## Если Prometheus у вас уже есть

Ставить второй не нужно. Кнопка «Найти установленные» спрашивает у Kubernetes API сервисы и ресурсы Prometheus Operator, проверяет каждого кандидата запросом и предлагает подставить его. Сеть не сканируется, а по найденным адресам Kamerton шлёт только GET.

Если у каждой команды свой Prometheus, заведите несколько наборов программ и выберите набор для каждой системы. Правила и маршруты доставляются объектами PrometheusRule и AlertmanagerConfig с метками, по которым их заберёт нужный экземпляр оператора. Без Prometheus Operator свой Prometheus пока не подключить. Подробнее в разделе [Уже работающие программы](/ru/docs/existing-programs).

<Shot name="status" class="k-wide-half" alt="Страница «Состояние Kamerton» с двумя наборами программ: «Основной» и «Команда Б»" caption="Два набора программ. Без кластера они показаны как не подключённые." />

## Как читается сообщение

Kamerton заменяет шаблоны Alertmanager своими. В первой строке важность, система и окружение. Дальше по строке на оповещение: сервис, что случилось, текущее значение и порог, с какого времени. Время пишется в поясе команды со сдвигом, например «09:18 16.11 UTC+5». Если задан `externalURL`, под каждым оповещением ссылка на его страницу в интерфейсе. Склеенные оповещения идут списком до восьми штук, дальше их число.

Язык сообщений русский или английский. Для любого правила можно написать свой заголовок, пояснение и первое действие для дежурного с подстановками `{value}`, `{threshold}`, `{service}`, `{since}`. Каналы подключаются в интерфейсе. Токен бота и пароль почты хранятся только в Secret и в описание не попадают. Подробнее в разделе [Оповещения](/ru/docs/notifications).

<Shot name="channels" :dark="false" class="k-wide-half" alt="Страница «Каналы уведомлений»: подключённый бот Telegram, три чата и почта" caption="Экран «Каналы». Бот и чаты на снимке демонстрационные: при локальном запуске каналы не настраиваются." />

## Чего пока нет

Готового образа и репозитория чартов нет, образ собирается из исходников. Пользователь один на всех, без ролей и журнала действий. Интерфейс только на русском. Одна установка работает с одним кластером. Мы проверяли Kamerton на одноузловом k3s рядом с OpenTelemetry Demo, но долгого прогона на ложные срабатывания ещё не было: прогон на 72 часа под реальной нагрузкой запланирован. Почта проверена только на тестовом SMTP-сервере. Остальное в разделе [Ограничения и статус](/ru/docs/limitations).

## Как поставить

Нужны Kubernetes 1.27 или новее, Helm и Docker. Образ собирается из клона репозитория, программы наблюдения ставятся как зависимости чарта с зафиксированными версиями.

<div class="vp-doc k-wide-code">

```sh
git clone https://github.com/kamerton-labs/kamerton.git && cd kamerton
docker build -t kamerton:dev .
helm install kamerton ./deploy/helm/kamerton \
  --namespace kamerton --create-namespace --dependency-update \
  --set image.repository=kamerton --set image.tag=dev \
  --set externalURL=http://localhost:8080
```

</div>

Как сделать образ доступным кластеру, включить вход и применить описание демо, написано в [быстром старте](/ru/docs/quick-start). Демо-магазин со сценариями сбоев описан в [разделе о демо](/ru/docs/demo).

<VideoTour />

## Лицензии

Kamerton распространяется по лицензии GNU AGPL v3.0 only. Программы наблюдения ставятся без изменений из своих чартов и образов, у них свои авторы и лицензии. Kamerton настраивает их через ресурсы Kubernetes и HTTP API. Подробнее в разделе [Лицензия и сторонние программы](/ru/docs/license).

<div class="vp-doc">

| Программа | Лицензия | Чарт |
| --- | --- | --- |
| Prometheus, Prometheus Operator, Alertmanager | Apache-2.0 | kube-prometheus-stack |
| OpenTelemetry Collector | Apache-2.0 | opentelemetry-collector |
| Grafana | AGPL-3.0 | grafana |
| Loki | AGPL-3.0 | loki |
| Tempo | AGPL-3.0 | tempo |

</div>

Код и Helm-чарт лежат в [kamerton-labs/kamerton](https://github.com/kamerton-labs/kamerton), демо-магазин и пример со вторым Prometheus в [kamerton-labs/examples](https://github.com/kamerton-labs/examples).

</div>
