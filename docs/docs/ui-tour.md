# Web UI tour

The UI is built into the same binary as the core: nothing extra to install. It edits system descriptions and shows what is happening to them. The UI is in English by default; Russian is picked in the language menu in the sidebar. It has a light and a dark theme.

The screenshots were taken from the real UI run locally without a cluster and without Prometheus. So wherever live data is needed - rule states, discovered services, active alerts - they read "no data" or "not connected".

## Systems

The list of systems with their state: number of services, rules and channels, and whether anything is firing. The "Getting started" block shows what is not done yet: connect Prometheus, find services, create rules, connect a channel. "Add system" creates a new description.

<Shot name="systems" alt="Systems screen: a four-step getting-started block and the otel-demo system card with its counts of services, rules and channels" />

## Diagram

The canvas: services and the calls between them. Blocks are added with the HTTP, gRPC, "Queue" and "Database" buttons or by dragging; a call is drawn as a line from the right edge of a card to the service it calls. Services that already send telemetry but are not described yet are listed under "Found in telemetry" and are added with one click. On the left, "Where to send alerts": the system's receivers, the message language, the time zone of messages and the set of programs.

<Shot name="canvas" alt="Canvas of the otel-demo system: service blocks with rule counts, calls between them, Telegram and email receivers on the left" />

Clicking a service opens its settings, for example the "Critical service" switch.

## Rules

A table of all the system's rules with filters by service, kind of check and state. Each rule is described as a short phrase, for example "errors above 5% for 1 min". In a rule card:

- the threshold, how long the condition must hold, and the severity;
- a backtest over a day, 3 or 7 days - how many times the rule would have fired;
- the team's own notification text with a preview;
- "How often it fires": real firings over the last days, how many cleared by themselves, a quieter value for a noisy rule, and the "Useful" and "Noise" buttons. See [Quieter rules](./quieter-rules).

A noisy rule has a "noisy" mark in the table, and the "Noisy" filter shows only those.

"Create rule" adds a rule from the library or a custom one.

<Shot name="rule-card" alt="Rule list filtered to the checkout service, with the error-rate rule card open: error share, pending period and severity fields" />

## YAML

The same document as text. Hints appear as you type or on Ctrl+Space, a field's explanation on hover, and errors are marked in the text. While the text does not parse, the canvas shows the last valid version and is read-only.

Canvas, rules and YAML are three views of one description: a change in one shows in the others at once. The UI changes only the parts of the document it needs to, so comments and formatting of the rest survive.

<Shot name="yaml" alt="The otel-demo description in YAML mode: services frontend, checkout and payment with thresholds and availability objectives" />

Changes are saved with "Save": to the `SystemDescription` resource in a cluster, to the file locally.

## Channels

Telegram and email setup: the bot token or mail server password is entered here and stored only in a Secret. Chats the bot was added to appear by themselves; email recipients are created here too. Each chat shows which systems write to it and has a test-message button. Details: [Notifications](./notifications).

<Shot name="channels" :dark="false" alt="Notification channels screen with a Telegram bot and three chats" caption="Demo bot and chats: channels cannot be set up in local mode." />

## Alerts

What is firing now across all systems, grouped into incidents. An incident names its cause ("Cause: payment is failing, and the services that call it fail with it."), lists the affected services and says which of their alerts were not sent because they were muted. Below it is the evidence of the follow-up: what changed, the operation with most errors, a log line, a link to failing traces. If the same service failed before, the last time is shown with its notes.

The "History" view lists past incidents, newest first, with their duration. Each one can get a note: the cause and what helped. Notes written in reply to the "incident over" message in Telegram show up here too. See [Incidents](./incidents).

Without a connected Alertmanager this screen is empty, so there is no screenshot here.

## Runbooks

Every service has a runbook page for the person on call: a stub Kamerton generates, or your own `runbookURL`. Links in notifications lead there. Under "What helped before" the page lists the last notes about incidents of this service. Alerts about the whole system have a runbook page of their own, `_system`.

## Kamerton status

Sets of programs and the state of each program, addresses with a check before saving, finding installed programs. At the bottom, the settings given at startup: the address for links, where descriptions are stored, whether login is on. Details: [Programs you already run](./existing-programs).

<Shot name="status" alt="Kamerton status page with two sets of programs" />

## Login

With login on, the UI asks for the user name and password first. While it is off, the Channels screen warns about it with a red notice. See [Security](./security).
