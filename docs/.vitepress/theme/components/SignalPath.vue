<script setup lang="ts">
// How a signal travels, followed with one real failure: payment starts failing,
// and the diagram shows what the signal is at each stop - a span, a counter, a
// firing rule, a routed and a muted alert, the message. Squares mark the two
// stops whose configuration Kamerton writes (rules, Alertmanager routes).
//
// The signal moves with the page: scroll down and it walks from the service to
// the message, scroll up and it walks back. A stop lights up when the signal
// reaches it. Each stop is a button that shows it until the next scroll. With
// prefers-reduced-motion the finished path stays still and only clicks change it.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Line = { k: string; v: string; tone?: 'err' | 'mute' }

const t = {
  label: 'Path of a signal from a service to the message for the person on call, followed with one failing payment',
  legend:
    'Squares mark what Kamerton writes from the system description: the rules and the Alertmanager routes. It installs the other programs from their own charts and connects them.',
  at: 'At this stop',
  stops: [
    {
      name: 'Service',
      note: 'sends traces, metrics and logs over OTLP',
      shows: [
        { k: 'span', v: 'checkout → payment  oteldemo.PaymentService/Charge' },
        { k: 'status', v: 'ERROR  412 ms', tone: 'err' },
      ],
    },
    {
      name: 'OpenTelemetry Collector',
      note: 'derives calls, errors and latency from traces',
      shows: [
        { k: 'counter', v: 'traces_span_metrics_calls_total{service_name="payment", status_code="STATUS_CODE_ERROR"} +1', tone: 'err' },
        { k: 'latency', v: 'traces_span_metrics_duration_milliseconds_bucket{le="500"} +1' },
      ],
    },
    {
      name: 'Prometheus, Loki, Tempo',
      note: 'store metrics, logs and traces',
      shows: [
        { k: 'Prometheus', v: 'the counter, one more point every 15 s' },
        { k: 'Tempo', v: 'the whole request: 9 steps, checkout → payment' },
        { k: 'Loki', v: 'card declined: upstream timeout  trace_id=4bf92f35…' },
      ],
    },
    {
      name: 'Rules',
      note: 'Prometheus evaluates them every 15 seconds',
      managed: true,
      shows: [
        { k: 'rule', v: 'payment: errors above 5% for 1 min' },
        { k: 'now', v: '12% of calls fail  →  firing', tone: 'err' },
      ],
    },
    {
      name: 'Alertmanager',
      note: 'groups repeats and picks the receiver',
      managed: true,
      shows: [
        { k: 'sends', v: 'payment: Too many failed requests  →  oncall-telegram', tone: 'err' },
        { k: 'mutes', v: 'checkout, frontend: they fail because they call payment', tone: 'mute' },
        { k: 'webhook', v: '→ Kamerton, for the follow-up 45 s later' },
      ],
    },
    {
      name: 'Telegram or email',
      note: '“payment: Too many failed requests”',
      shows: [
        { k: '', v: '🔴 payment: Too many failed requests', tone: 'err' },
        { k: '', v: 'now 12%, threshold 5% · since 16:50 UTC' },
        { k: '', v: 'Open in Kamerton' },
      ],
    },
  ] as { name: string; note: string; managed?: boolean; shows: Line[] }[],
}

const last = t.stops.length - 1
const root = ref<HTMLElement | null>(null)

// Where the signal is, in stops from 0 to `last`, as a fraction. It follows the
// scroll: the figure's top crossing from 80% to 25% of the window walks it from
// the service to the message, and scrolling back walks it back. The server
// renders the finished path.
const pos = ref(last)
const started = ref(false)
const reduced = ref(false)
const pinned = ref<number | null>(null) // a stop the reader clicked, until the next scroll

const at = computed(() => (pinned.value ?? pos.value))
const arrived = computed(() => Math.min(last, Math.floor(at.value + 0.05)))
const shown = computed(() => t.stops[arrived.value])

let frame = 0
let lastY = 0
function measure() {
  frame = 0
  const el = root.value
  if (!el) return
  if (pinned.value !== null && Math.abs(window.scrollY - lastY) < 40) return
  pinned.value = null
  const top = el.getBoundingClientRect().top
  const h = window.innerHeight
  const p = (h * 0.8 - top) / (h * 0.55)
  pos.value = Math.max(0, Math.min(1, p)) * last
  started.value = true
}
const onScroll = () => {
  if (!frame) frame = requestAnimationFrame(measure)
}

function jump(i: number) {
  pinned.value = i
  lastY = window.scrollY
  started.value = true
}

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced.value) return
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  measure()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <figure ref="root" class="k-sig" :class="{ 'is-started': started }" :aria-label="t.label">
    <div class="k-sig__body">
      <span class="k-sig__line" aria-hidden="true" />
      <span class="k-sig__fill" :class="{ 'is-on': started }" :style="{ '--p': String(at / last) }" aria-hidden="true" />
      <div class="k-sig__track" :class="{ 'is-glide': pinned !== null }" :style="{ '--p': String(at / last) }" aria-hidden="true">
        <span class="k-sig__run"><i class="k-sig__dot" :class="{ 'is-shown': started }" /></span>
      </div>
      <ol class="k-sig__stops">
        <li
          v-for="(s, i) in t.stops"
          :key="i"
          class="k-sig__item"
          :class="{
            'is-managed': s.managed,
            'is-ahead': started && i > arrived,
            'is-here': started && i === arrived,
          }"
        >
          <button
            type="button"
            class="k-sig__stop"
            :aria-current="started && i === arrived ? 'step' : undefined"
            @click="jump(i)"
          >
            <span class="k-sig__mark" aria-hidden="true" />
            <span class="k-sig__name">{{ s.name }}</span>
            <span class="k-sig__note">{{ s.note }}</span>
          </button>
        </li>
      </ol>
    </div>
    <div class="k-sig__panel">
      <p class="k-sig__panel-head">
        <span>{{ t.at }}:</span> <b>{{ shown.name }}</b>
      </p>
      <Transition name="k-sig-swap" mode="out-in">
        <dl :key="arrived" class="k-sig__shows">
          <template v-for="(l, j) in shown.shows" :key="j">
            <dt>{{ l.k }}</dt>
            <dd :class="l.tone ? `is-${l.tone}` : undefined">{{ l.v }}</dd>
          </template>
        </dl>
      </Transition>
    </div>
    <figcaption class="k-sig__legend">
      <span>{{ t.legend }}</span>
    </figcaption>
  </figure>
</template>
