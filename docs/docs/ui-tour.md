# Web UI tour

The UI is built into the same binary as the core: nothing extra to install. It edits system descriptions and shows what is happening to them. The UI is in Russian only for now; the screen names below are given in Russian with a translation. It has a light and a dark theme.

The screenshots were taken from the real UI run locally without a cluster and without Prometheus. So wherever live data is needed - rule states, discovered services, active alerts - they read "no data" or "not connected".

## Systems («Системы»)

The list of systems with their state: number of services, rules and channels, and whether anything is firing. The «С чего начать» (getting started) block shows what is not done yet: connect Prometheus, find services, create rules, connect a channel. «Добавить систему» (Add system) creates a new description.

<Shot name="systems" alt="Systems screen: a four-step getting-started block and the otel-demo system card - 16 services, 164 rules, 2 channels" />

## Canvas («Схема»)

Services and the calls between them. Blocks are added with the HTTP, gRPC, «Очередь» (queue) and «База данных» (database) buttons or by dragging; a call is drawn as a line from the right edge of a card to the service it calls. Services that already send telemetry but are not described yet are listed under «Найдены в телеметрии» (found in telemetry) and are added with one click. On the left, «Куда отправлять оповещения» (where alerts go): the system's receivers, the time zone of messages and the set of programs.

<Shot name="canvas" alt="Canvas of the otel-demo system: service blocks with rule counts, calls between them, Telegram and email receivers on the left" />

Clicking a service opens its settings, for example the «Важный сервис» (critical service) switch.

## Rules («Правила»)

A table of all the system's rules with filters by service, kind of check and state. Each rule is described as a short phrase, for example "errors above 5% for 1 min". In a rule card:

- the threshold, how long the condition must hold, and the severity;
- a backtest over a day, 3 or 7 days - how many times the rule would have fired;
- the team's own notification text with a preview.

«Создать правило» (Create rule) adds a rule from the library or a custom one.

<Shot name="rule-card" alt="Rule list filtered to the checkout service, with the error-rate rule card open: error share, pending period and severity fields" />

## YAML

The same document as text. Hints appear as you type or on Ctrl+Space, a field's explanation on hover, and errors are marked in the text. While the text does not parse, the canvas shows the last valid version and is read-only.

Canvas, rules and YAML are three views of one description: a change in one shows in the others at once. The UI changes only the parts of the document it needs to, so comments and formatting of the rest survive.

<Shot name="yaml" alt="The otel-demo description in YAML mode: services frontend, checkout and payment with thresholds and availability objectives" />

Changes are saved with «Сохранить» (Save): to the `SystemDescription` resource in a cluster, to the file locally.

## Channels («Каналы»)

Telegram and email setup: the bot token or mail server password is entered here and stored only in a Secret. Chats the bot was added to appear by themselves; email recipients are created here too. Each chat shows which systems write to it and has a test-message button. Details: [Notifications](./notifications).

<Shot name="channels" :dark="false" alt="Notification channels screen with a Telegram bot and three chats" caption="Demo bot and chats: channels cannot be set up in local mode." />

## Alerts («Оповещения»)

What is firing now across all systems: a title, value, threshold and the probable source. Kamerton walks the `dependsOn` graph and shows the chain of affected services. Without a connected Alertmanager this screen is empty, so there is no screenshot here.

## Runbooks

Every service has a runbook page for the person on call: a stub Kamerton generates, or your own `runbookURL`. Links in notifications lead there.

## Kamerton status («Состояние Kamerton»)

Sets of programs and the state of each program, addresses with a check before saving, finding installed programs. At the bottom, the settings given at startup: the address for links, where descriptions are stored, whether login is on. Details: [Programs you already run](./existing-programs).

<Shot name="status" alt="Kamerton status page with the sets «Основной» (main) and «Команда Б» (team B)" />

## Login

With login on, the UI asks for the user name and password first. While it is off, the Channels screen warns about it with a red notice. See [Security](./security).
