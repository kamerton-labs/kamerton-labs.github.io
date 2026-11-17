import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './custom.css'

import Shot from './components/Shot.vue'
import SignalPath from './components/SignalPath.vue'
import ThreeViews from './components/ThreeViews.vue'
import VideoTour from './components/VideoTour.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Shot', Shot)
    app.component('SignalPath', SignalPath)
    app.component('ThreeViews', ThreeViews)
    app.component('VideoTour', VideoTour)
  },
} satisfies Theme
