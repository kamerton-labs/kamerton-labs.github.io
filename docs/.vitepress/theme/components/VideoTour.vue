<script setup lang="ts">
// Video tour. Until a video exists it is one plain line of text.
// To publish the tour, pass `src` (a file in docs/public or a full URL) and,
// optionally, `poster` and `captions` (a .vtt file):
//   <VideoTour src="/video/kamerton-tour.mp4" poster="/video/poster.webp" />
// Or replace the component in index.md with a plain link.
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

const props = defineProps<{ src?: string; poster?: string; captions?: string }>()
const { lang } = useData()

const isRu = computed(() => lang.value.startsWith('ru'))
const resolve = (p?: string) => (p && p.startsWith('/') ? withBase(p) : p)
</script>

<template>
  <video
    v-if="props.src"
    class="k-video"
    controls
    preload="metadata"
    :src="resolve(props.src)"
    :poster="resolve(props.poster)"
  >
    <track
      v-if="props.captions"
      kind="subtitles"
      :src="resolve(props.captions)"
      :srclang="isRu ? 'ru' : 'en'"
      default
    />
  </video>
  <p v-else class="k-video-none">
    {{
      isRu
        ? 'Видеообзора пока нет. Когда он появится, он будет здесь.'
        : 'There is no video tour yet. When there is one, it will be here.'
    }}
  </p>
</template>
