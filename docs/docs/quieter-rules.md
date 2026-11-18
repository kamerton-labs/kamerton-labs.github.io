# Quieter rules

A rule that fires forty times a week and clears by itself each time teaches people to ignore it, and then they ignore the real one too. Kamerton counts how each rule behaved, says which rules are noisy and, for such a rule, suggests a change. It never applies the change itself: you apply it, and it is an ordinary edit of the description.

New in 0.2.0. Covered by unit tests against a fake Prometheus and a fake Telegram API; little time on a real cluster so far.

## What is counted

For each rule of a system, over the last 1, 3 or 7 days, from the alert history in the system's Prometheus (`ALERTS` and `ALERTS_FOR_STATE`):

- how many times it fired;
- how many of those firings cleared within 5 minutes ("short");
- the longest firing and when it last fired;
- the firings that were muted as consequences, see below;
- what people said: "useful" or "noise".

It costs two range queries per system, however many rules there are. Nothing is stored except the verdicts.

### Consequences are not noise

When `payment` is down, the error alerts of `checkout` and `frontend` fire too, and Alertmanager mutes them through the [grouping by cause](./incidents#muting-by-cause). The alert history does not know about that muting, so Kamerton replays it with the same links. Such firings, and per-service "no data" during the system-wide one, are counted as `consequences` and left out of everything else on this page.

## When a rule is noisy

Without verdicts: at least 10 firings in the window, at least 3 a day on average, and at least three quarters of them short. A bad day with a few short real outages stays below that. A rule flapping tens of times a week does not.

With verdicts: at least 2 "noise" that outnumber "useful" make a rule noisy. At least 2 "useful" that outnumber "noise" make it not noisy, whatever its history says.

In the UI a noisy rule has a "noisy" mark in the rule list, there is a "Noisy" filter, and the list says how many rules are noisy this week.

## The suggestion

For a noisy rule that has a threshold or a pending period (`for`), Kamerton runs the [backtest](./rules#common-to-all-rules) with a few changes, in this order:

1. a threshold at most 1.5 times higher (1.25 and 1.5 times). It adds no delay;
2. a longer `for`: 1m, 2m, 3m, 5m or 10m. At most 3m for a critical rule, so it still pages within about five minutes, and at most 10m for a warning;
3. a threshold 2 or 3 times higher, which changes what the rule calls bad. For a custom "less than" rule the threshold goes down instead.

It suggests the first change that would have removed at least 80% of the short firings and still caught every firing of 10 minutes or more. A change that would never have fired at all is offered only for a rule that fired at least 20 times. With fewer firings such a change would just switch the rule off, so it is not offered.

A longer `for` comes with its cost: how much later a real failure would be reported. The rule card says it in plain words ("You would hear about a real failure ... later"), and the API returns it as `delaySeconds`.

Suggestions are computed on request, for at most 5 rules per system, the ones with most firings first.

## Applying it

The card of a noisy rule has a "How often it fires" block with the counts and the suggestion. "Apply" puts the value into the card ("Set in the card. Save to make it work."), and "Save" writes it into the description like any other edit. The value is written as the description field takes it, for example:

```yaml
errorRate:
  threshold: 0.063
latency:
  for: 3m
saturation:
  memory: 768Mi
```

## Useful or noise

Under every follow-up message in Telegram there are two buttons, "Useful" and "Noise". A press counts for the rules of the incident's root alerts. Pressing the other button later changes the verdict, and Telegram shows a short answer such as "Thanks, marked as useful" or "Already marked".

Presses count only from chats that get the system's alerts through Kamerton's bot; from any other chat the answer is "This chat does not get the alerts of this system". The alert message itself comes from Alertmanager and cannot have buttons.

The rule card asks the same question, "Was this alert worth it?", with the same two buttons.

Kamerton keeps counters only, nothing about who pressed, in the ConfigMap `kamerton-noise-state` (in memory without a cluster).

## In the API

`GET /api/v1/systems/{id}/noise?window=7d` takes `1d`, `3d` or `7d`. One rule from the answer:

```json
{
  "alert": "KamertonErrorRateHigh", "service": "checkout", "operation": "",
  "fired": 40, "short": 37, "consequences": 4, "longestSeconds": 720,
  "lastFiredAt": "2026-11-16T04:18:00Z",
  "feedback": {"useful": 1, "noise": 5}, "noisy": true,
  "suggestion": {"field": "threshold", "current": "0.05", "suggested": "0.075",
                 "wouldFire": 3, "wouldMiss": 0, "wouldShort": 1, "delaySeconds": 0,
                 "path": "errorRate.threshold", "format": "share"}
}
```

Verdicts can also be sent with `POST /api/v1/systems/{id}/noise/feedback`. The answer says `available: false` with a reason when the system's set of programs has no Prometheus or it does not answer.
