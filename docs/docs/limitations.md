# Limitations and status

Version 0.1.0, early. Below: what works, where it was tried and what is missing. We do not promise dates.

## What works

Covered by unit tests:

- the description format with validation and JSON Schema;
- the rule library: every rule file is validated with Prometheus' own parser, and the requests-stopped rule is also tested with Prometheus' engine;
- generation of rules, a basic dashboard, Alertmanager routes and runbook stubs;
- the controller with status conditions;
- discovery, backtest and probable-source search;
- the UI: systems list, canvas, rules with readable cards, backtest and custom rules, YAML mode, runbook pages, channels, status page;
- saving descriptions from the UI: custom resource in a cluster, file locally;
- Telegram and email setup from the UI, Kamerton's own message templates;
- sets of programs and login.

End-to-end UI scenarios are run by the maintainers before each release.

## Where it was tried

A single-node k3s cluster with the OpenTelemetry Demo:

- the Helm chart installs and runs;
- the rule library fires on the demo's built-in fault scenarios;
- alerts are delivered to Telegram;
- sets of programs work, including finding installed programs and a second Prometheus.

## Not done yet, and known limits

- No published container image or chart repository. You build the image from source.
- One shared user, no roles or per-user audit.
- No long false-alert run yet. A 72-hour run on real traffic is planned.
- No pruning. An object a system stops generating (for example its AlertmanagerConfig after the last receiver is removed) stays until the system itself is deleted. Deleting a system removes all its objects.
- Email is verified only against a test SMTP server, not a real mail provider.
- Your own Prometheus needs the Prometheus Operator. Pushing to Prometheus or Grafana HTTP APIs is not implemented.
- One cluster per installation. Several clusters are not supported.
- The UI is in Russian only. Notifications can be Russian or English.
- Dashboards are basic. Notifications are not yet enriched with traces or logs.
- Channels and finding installed programs need a cluster. They cannot be set up when running locally.

## Following changes

[CHANGELOG.md](https://github.com/kamerton-labs/kamerton/blob/main/CHANGELOG.md) in the repository.
