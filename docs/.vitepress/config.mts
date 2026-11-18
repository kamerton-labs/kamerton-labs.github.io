import { defineConfig, type DefaultTheme } from 'vitepress'

const CODE = 'https://github.com/kamerton-labs/kamerton'
const EXAMPLES = 'https://github.com/kamerton-labs/examples'

function sidebar(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Getting started',
      items: [
        { text: 'Quick start', link: '/docs/quick-start' },
        { text: 'Demo shop', link: '/docs/demo' },
        { text: 'Web UI tour', link: '/docs/ui-tour' },
      ],
    },
    {
      text: 'Using Kamerton',
      items: [
        { text: 'Describe a system', link: '/docs/describe-system' },
        { text: 'Rule library', link: '/docs/rules' },
        { text: 'Notifications', link: '/docs/notifications' },
        { text: 'Incidents', link: '/docs/incidents' },
        { text: 'Quieter rules', link: '/docs/quieter-rules' },
        { text: 'Programs you already run', link: '/docs/existing-programs' },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'Configuration', link: '/docs/configuration' },
        { text: 'Security', link: '/docs/security' },
        { text: 'Architecture', link: '/docs/architecture' },
        { text: 'Limitations and status', link: '/docs/limitations' },
        { text: 'Licence and third-party programs', link: '/docs/license' },
      ],
    },
  ]
}

export default defineConfig({
  title: 'Kamerton',
  description: 'Observability for Kubernetes microservices from one system description',
  // Root path; the site keeps working under a custom domain because no link
  // carries an absolute origin.
  base: '/',
  cleanUrls: true,
  lastUpdated: false,
  appearance: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0f172a' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Kamerton' }],
  ],
  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  lang: 'en-US',
  themeConfig: {
    logo: { src: '/logo.svg', alt: '' },
    siteTitle: 'Kamerton',
    socialLinks: [{ icon: 'github', link: CODE, ariaLabel: 'GitHub' }],
    search: { provider: 'local' },
    nav: [
      { text: 'Docs', link: '/docs/quick-start', activeMatch: '^/docs/' },
      { text: 'Limitations', link: '/docs/limitations' },
      { text: 'Examples', link: EXAMPLES },
    ],
    sidebar: { '/docs/': sidebar() },
    outline: { level: [2, 3], label: 'On this page' },
    footer: {
      message: 'Kamerton is licensed under AGPL-3.0-only.',
      copyright: '© 2026 The Kamerton Authors',
    },
  },
})
