# Notifications

Alertmanager delivers notifications along the routes Kamerton generates from the system description. Channels are Telegram and email. The easiest way to connect them is the «Каналы» (Channels) screen in the UI; Telegram and email are set up from the UI only in a cluster.

Channels are shared by all systems. What each system sends to which chat or address is chosen inside the system: on the canvas, in the «Куда отправлять оповещения» (where alerts go) panel.

<Shot name="channels" :dark="false" alt="Notification channels page: a Telegram bot, the chats «Дежурные», «Команда оплаты», «Сводка для руководства» and an “add chat” block" caption="The Channels screen. The bot and chats here are demo data, not real ones." />

## Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather) (`/newbot`) and paste the token on the Channels screen. The core checks it with `getMe` and stores it in the Secret `kamerton-telegram` (key `bot-token`) in Kamerton's namespace. The token is never written to the description, logs or API responses; the UI only shows the bot's name. An existing Secret with that name keeps working.
2. Add the bot to your groups. The core polls Telegram and lists the chats within seconds. Chats the bot is removed from are marked unavailable. A group upgraded to a supergroup is followed to its new ID, including receivers in the description.
3. Send a test message, choose severities (and optionally services) for the chat, and save. Receivers and routes are written into the system description and the controller regenerates the AlertmanagerConfig.

**Telegram's limits.** Telegram keeps updates for 24 hours and has no "list my chats" call. A chat the bot joined long before Kamerton started does not appear by itself: check it by ID on the same screen, or re-add the bot. A bot may have only one update consumer and no webhook - use a dedicated bot for Kamerton.

## Email

1. Connect the mail server: SMTP `host:port` (with hints for Yandex, Mail.ru and Gmail), sender address, login and password. The core logs in to check the settings and stores the password in the Secret `kamerton-smtp` (key `password`). The server, sender and login are kept in the ConfigMap `kamerton-email-state`. The password is never written to the description, logs or API responses.
2. Add recipients: a name and one or more addresses, for example "On call" with two addresses. A test email checks delivery.
3. In a system, «Куда отправлять оповещения» → «Добавить получателя» (add receiver) offers both Telegram chats and email recipients.

Changing the server or a recipient's addresses later updates every system that uses it.

::: warning Email is verified against a test server only
Email sending has been verified against a test SMTP server, not a real mail provider.
:::

## Receivers and routes in the description

Whatever you set up in the UI is written into the description in the usual shape. Receivers can also be written by hand - they keep working and the UI leaves them untouched.

```yaml
notifications:
  receivers:
    - name: oncall-telegram
      telegram:
        chatID: -1001234567890            # replace with yours
        botTokenSecret: {name: kamerton-telegram, key: bot-token}
    - name: team-email
      email:
        to: [oncall@example.com]
        from: kamerton@example.com
        smarthost: smtp.example.com:587
        authUsername: kamerton@example.com
        authPasswordSecret: {name: kamerton-smtp, key: password}
  routing:
    critical: [oncall-telegram, team-email]
    warning: [team-email]
    groupBy: [alertname, service]   # default
    repeatInterval: 4h              # default
    routes:
      - receiver: team-email
        severities: [critical]
        services: [payment]
  language: en
  timeZone: Europe/Berlin
```

- `critical`, `warning` - receivers of alerts of every service with that severity.
- `routes` - a receiver only for the listed services (and, if given, only those severities).
- `groupBy` - labels that group alerts into one message.
- `repeatInterval` - how often to repeat a message for an alert that is still firing.

Descriptions that send notifications must live in Kamerton's namespace. Which Secret references are accepted and why: [Security](./security#secret-references).

## What a message contains

Kamerton uses its own message templates for Telegram and email instead of Alertmanager's defaults. A message has:

- firing or resolved, severity, system and environment;
- per alert: the service, what is wrong in plain words, the current value and threshold, since when;
- links to the alert page and the runbook in the UI, when `externalURL` is set.

Grouped alerts are listed compactly: at most 8, then a count.

## Language and time zone

Messages are in Russian by default; `spec.notifications.language: en` switches them and the alert descriptions to English.

Times are in UTC by default. Another zone is set in `spec.notifications.timeZone` as an IANA name, for example `Asia/Almaty` or `Europe/Berlin`, or on the canvas in the «Куда отправлять оповещения» panel. Times carry the offset: "09:18 16.11 UTC+5".

Kamerton computes the offsets itself from the time-zone database embedded in the binary, including daylight-saving changes, so a zone works even if the Alertmanager image lacks it.

## Your own text

Any rule can carry the team's own notification text in any language: a title, an explanation and a first action for the person on call. In the UI it is set in the rule card, under «Текст оповещения» (notification text), with a preview.

```yaml
errorRate:
  threshold: 0.01
  message:
    title: Payments are failing
    text: Errors {value} with threshold {threshold} in {service}, since {since}
    action: Check the payment gateway and the latest deploys
```

Placeholders are a fixed list:

| Placeholder | Replaced with |
| --- | --- |
| `{value}` | the current value |
| `{threshold}` | the threshold |
| `{service}` | the service |
| `{operation}` | the operation; empty when the rule is not about one operation |
| `{system}` | the system |
| `{since}` | when the alert started |

Other braces and any markup are rejected by validation: the text is shown as written. Values are escaped.

Where the text goes: `message` on the error, latency, requests-stopped, queue, SLO and custom rules; `memoryMessage`, `cpuMessage`, `oomKilledMessage`, `restartsMessage` on the resource rules; `consumerStoppedMessage` on the "nobody reads the queue" rule.
