<script setup lang="ts">
// Canvas, rules and YAML: three real screenshots of the same description,
// behind a tab switcher. All three panels sit in one grid cell, so the block
// keeps the height of the tallest and switching never moves the page.
//
// It advances on its own, slowly, until the reader touches it; it waits while
// hovered or focused, off screen or in a hidden tab, and never moves on its
// own with prefers-reduced-motion. The timer is a CSS animation on the active
// tab's progress line, so pausing it is just animation-play-state.
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { useMotionGate } from '../motion'

const views = [
    {
      id: 'canvas',
      tab: 'Canvas',
      alt: 'Canvas of the otel-demo system: service blocks with rule counts, calls between them, Telegram and email receivers on the left',
      caption: 'Services of the demo shop and the calls between them. Alert receivers and the message time zone on the left.',
    },
    {
      id: 'rule-card',
      tab: 'Rules',
      alt: 'Rule list of the otel-demo system with the error-rate rule card of the checkout service open: threshold 5% and a backtest',
      caption: 'All rules of the system. The checkout error rule is open: threshold 5%, severity, backtest.',
    },
    {
      id: 'yaml',
      tab: 'YAML',
      alt: 'The otel-demo description in YAML mode with highlighting and line numbers',
      caption: 'The same document as text, with field hints and errors marked on the lines themselves.',
    },
]

const label = 'Three views of one description'
const src = (id: string, theme: 'light' | 'dark') => withBase(`/screens/${id}-${theme}.webp`)

const root = ref<HTMLElement | null>(null)
const tabs = ref<HTMLButtonElement[]>([])
const { reduced, onScreen, pageVisible } = useMotionGate(root)

const current = ref(0)
const mounted = ref(false)
const touched = ref(false)
const hovered = ref(false)
const focused = ref(false)

onMounted(() => (mounted.value = true))

const auto = computed(() => mounted.value && !reduced.value && !touched.value)
const paused = computed(() => hovered.value || focused.value || !onScreen.value || !pageVisible.value)

function select(i: number, focus = false) {
  current.value = (i + views.length) % views.length
  if (focus) tabs.value[current.value]?.focus()
}

function choose(i: number) {
  touched.value = true
  select(i)
}

function onKey(e: KeyboardEvent) {
  const n = views.length
  const map: Record<string, number> = {
    ArrowRight: current.value + 1,
    ArrowLeft: current.value - 1,
    Home: 0,
    End: n - 1,
  }
  if (!(e.key in map)) return
  e.preventDefault()
  touched.value = true
  select(map[e.key], true)
}

function onTimerEnd() {
  if (auto.value) select(current.value + 1)
}

function onFocusOut(e: FocusEvent) {
  if (!root.value?.contains(e.relatedTarget as Node | null)) focused.value = false
}
</script>

<template>
  <section
    ref="root"
    class="k-views"
    :class="{ 'is-auto': auto }"
    :aria-label="label"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focusin="focused = true"
    @focusout="onFocusOut"
  >
    <div class="k-views__tabs" role="tablist" :aria-label="label" @keydown="onKey">
      <button
        v-for="(v, i) in views"
        :id="`k-views-tab-${v.id}`"
        :key="v.id"
        ref="tabs"
        type="button"
        role="tab"
        class="k-views__tab"
        :aria-selected="i === current ? 'true' : 'false'"
        :aria-controls="`k-views-panel-${v.id}`"
        :tabindex="i === current ? 0 : -1"
        @click="choose(i)"
      >
        {{ v.tab }}
        <span
          v-if="auto && i === current"
          :key="`timer-${current}`"
          class="k-views__timer"
          :class="{ 'is-paused': paused }"
          aria-hidden="true"
          @animationend="onTimerEnd"
        />
      </button>
    </div>
    <div class="k-views__stage">
      <div
        v-for="(v, i) in views"
        :id="`k-views-panel-${v.id}`"
        :key="v.id"
        role="tabpanel"
        class="k-views__panel"
        :class="{ 'is-current': i === current }"
        :aria-labelledby="`k-views-tab-${v.id}`"
        :aria-hidden="i === current ? undefined : 'true'"
        :inert="i !== current"
        :tabindex="i === current ? 0 : undefined"
      >
        <div class="k-shot__frame k-shot--has-dark">
          <img
            class="k-shot__img k-shot__img--light"
            :src="src(v.id, 'light')"
            :alt="v.alt"
            width="1440"
            height="900"
            loading="lazy"
            decoding="async"
          />
          <img
            class="k-shot__img k-shot__img--dark"
            :src="src(v.id, 'dark')"
            :alt="v.alt"
            width="1440"
            height="900"
            loading="lazy"
            decoding="async"
          />
        </div>
        <p class="k-views__caption">{{ v.caption }}</p>
      </div>
    </div>
  </section>
</template>
