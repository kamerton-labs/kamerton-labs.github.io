<script setup lang="ts">
// A real screenshot of the Kamerton UI in a neutral window frame.
// Files live in docs/public/screens as <name>-light.webp and, when captured,
// <name>-dark.webp (shown in the dark theme).
import { withBase } from 'vitepress'

const props = withDefaults(
  defineProps<{
    name: string
    alt: string
    caption?: string
    dark?: boolean
    eager?: boolean
  }>(),
  { dark: true, eager: false },
)

const light = withBase(`/screens/${props.name}-light.webp`)
const darkSrc = withBase(`/screens/${props.name}-dark.webp`)
</script>

<template>
  <figure class="k-shot" :class="{ 'k-shot--has-dark': dark }">
    <div class="k-shot__frame">
      <img
        class="k-shot__img k-shot__img--light"
        :src="light"
        :alt="alt"
        width="1440"
        height="900"
        :loading="eager ? 'eager' : 'lazy'"
        decoding="async"
      />
      <img
        v-if="dark"
        class="k-shot__img k-shot__img--dark"
        :src="darkSrc"
        :alt="alt"
        width="1440"
        height="900"
        :loading="eager ? 'eager' : 'lazy'"
        decoding="async"
      />
    </div>
    <figcaption v-if="caption || $slots.default" class="k-shot__caption">
      <slot>{{ caption }}</slot>
    </figcaption>
  </figure>
</template>
