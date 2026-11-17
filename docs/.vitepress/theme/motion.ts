// Small helpers for the two moving things on the home page (the signal
// diagram and the view switcher). Both render their final, static state on
// the server; motion starts only on the client, when the element is on screen,
// the tab is visible and the reader has not asked for reduced motion.
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useMotionGate(target: Ref<HTMLElement | null>) {
  const reduced = ref(false)
  const onScreen = ref(false)
  const pageVisible = ref(true)

  let mq: MediaQueryList | undefined
  let io: IntersectionObserver | undefined
  const onMq = () => (reduced.value = !!mq?.matches)
  const onVis = () => (pageVisible.value = document.visibilityState === 'visible')

  onMounted(() => {
    mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    onMq()
    mq.addEventListener('change', onMq)
    onVis()
    document.addEventListener('visibilitychange', onVis)
    if (target.value && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) onScreen.value = e.isIntersecting
        },
        { threshold: 0.35 },
      )
      io.observe(target.value)
    }
  })

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', onMq)
    document.removeEventListener('visibilitychange', onVis)
    io?.disconnect()
  })

  return { reduced, onScreen, pageVisible }
}
