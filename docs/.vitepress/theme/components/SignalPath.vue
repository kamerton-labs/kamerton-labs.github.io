<script setup lang="ts">
// How a signal travels, drawn as a plain diagram: one hairline, a marker per
// stop, a dot that moves from stop to stop. Squares mark the two stops whose
// configuration Kamerton writes (rules, Alertmanager routes).
//
// The server renders the finished diagram (every stop shown, no dot). On the
// client the dot runs only while the figure is on screen and the tab is
// visible; with prefers-reduced-motion it never runs on its own. Each stop is a
// button that moves the dot there and stops the loop.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { useMotionGate } from '../motion'

const { lang } = useData()
const ru = computed(() => lang.value.startsWith('ru'))

const t = computed(() =>
  ru.value
    ? {
        label: 'Путь сигнала от сервиса до сообщения дежурному',
        legend:
          'Квадратом отмечено то, что Kamerton пишет по описанию системы: правила и маршруты Alertmanager. Остальные программы он ставит из их собственных чартов и связывает между собой.',
        pause: 'Остановить',
        play: 'Запустить',
        stops: [
          { name: 'Сервис', note: 'шлёт трассы, метрики и логи по OTLP' },
          { name: 'OpenTelemetry Collector', note: 'считает по трассам запросы, ошибки и время ответа' },
          { name: 'Prometheus, Loki, Tempo', note: 'хранят метрики, логи и трассы' },
          { name: 'Правила', note: 'Prometheus проверяет их каждые 15 секунд', managed: true },
          { name: 'Alertmanager', note: 'склеивает повторы и выбирает получателя', managed: true },
          { name: 'Telegram или почта', note: '«checkout: Много ошибочных запросов»' },
        ],
      }
    : {
        label: 'Path of a signal from a service to the message for the person on call',
        legend:
          'Squares mark what Kamerton writes from the system description: the rules and the Alertmanager routes. It installs the other programs from their own charts and connects them.',
        pause: 'Stop',
        play: 'Play',
        stops: [
          { name: 'Service', note: 'sends traces, metrics and logs over OTLP' },
          { name: 'OpenTelemetry Collector', note: 'derives calls, errors and latency from traces' },
          { name: 'Prometheus, Loki, Tempo', note: 'store metrics, logs and traces' },
          { name: 'Rules', note: 'Prometheus evaluates them every 15 seconds', managed: true },
          { name: 'Alertmanager', note: 'groups repeats and picks the receiver', managed: true },
          { name: 'Telegram or email', note: '“checkout: Too many failed requests”' },
        ],
      },
)

const last = 5
const root = ref<HTMLElement | null>(null)
const { reduced, onScreen, pageVisible } = useMotionGate(root)

const started = ref(false) // false: the static, finished diagram (SSR state)
const active = ref(last)
const dot = ref(false)
const jumpNow = ref(false) // move the dot without a transition
const userStopped = ref(false)
const mounted = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined
const clear = () => {
  if (timer) clearTimeout(timer)
  timer = undefined
}
const later = (ms: number, fn: () => void) => {
  clear()
  timer = setTimeout(fn, ms)
}

const DWELL = 2100
const HOLD = 3600

function place(i: number, instant = false) {
  jumpNow.value = instant
  active.value = i
}

function step() {
  if (active.value < last) {
    place(active.value + 1)
    later(active.value === last ? HOLD : DWELL, step)
  } else {
    // End of the path: fade the dot, put it back at the start, pause, go again.
    dot.value = false
    later(500, () => {
      place(0, true)
      later(900, () => {
        dot.value = true
        later(DWELL, step)
      })
    })
  }
}

const canRun = computed(() => mounted.value && onScreen.value && pageVisible.value && !reduced.value && !userStopped.value)

watch(canRun, (ok) => {
  if (!ok) return clear()
  if (!started.value) {
    started.value = true
    place(0, true)
  }
  dot.value = true
  later(active.value === last ? HOLD : DWELL, step)
})

function jump(i: number) {
  clear()
  userStopped.value = true
  started.value = true
  place(i, reduced.value)
  dot.value = true
}

function toggle() {
  userStopped.value = !userStopped.value
}

// `mounted` flips after hydration so the first client render matches the server.
onMounted(() => (mounted.value = true))
onBeforeUnmount(clear)
</script>

<template>
  <figure ref="root" class="k-sig" :class="{ 'is-started': started }" :aria-label="t.label">
    <div class="k-sig__body">
      <span class="k-sig__line" aria-hidden="true" />
      <div
        class="k-sig__track"
        :class="{ 'is-instant': jumpNow }"
        :style="{ '--p': String(active / last) }"
        aria-hidden="true"
      >
        <span class="k-sig__run"><i class="k-sig__dot" :class="{ 'is-shown': dot }" /></span>
      </div>
      <ol class="k-sig__stops">
        <li
          v-for="(s, i) in t.stops"
          :key="i"
          class="k-sig__item"
          :class="{
            'is-managed': s.managed,
            'is-ahead': started && i > active,
            'is-here': started && i === active,
          }"
        >
          <button
            type="button"
            class="k-sig__stop"
            :aria-current="started && i === active ? 'step' : undefined"
            @click="jump(i)"
          >
            <span class="k-sig__mark" aria-hidden="true" />
            <span class="k-sig__name">{{ s.name }}</span>
            <span class="k-sig__note">{{ s.note }}</span>
          </button>
        </li>
      </ol>
    </div>
    <figcaption class="k-sig__legend">
      <span>{{ t.legend }}</span>
      <button v-if="mounted && !reduced" type="button" class="k-sig__toggle" @click="toggle">
        {{ userStopped ? t.play : t.pause }}
      </button>
    </figcaption>
  </figure>
</template>
