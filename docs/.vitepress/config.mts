import { defineConfig, type DefaultTheme } from 'vitepress'

const CODE = 'https://github.com/kamerton-labs/kamerton'
const EXAMPLES = 'https://github.com/kamerton-labs/examples'

function sidebarRu(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Начало',
      items: [
        { text: 'Быстрый старт', link: '/ru/docs/quick-start' },
        { text: 'Демо-магазин', link: '/ru/docs/demo' },
        { text: 'Обзор интерфейса', link: '/ru/docs/ui-tour' },
      ],
    },
    {
      text: 'Работа с Kamerton',
      items: [
        { text: 'Описание системы', link: '/ru/docs/describe-system' },
        { text: 'Библиотека правил', link: '/ru/docs/rules' },
        { text: 'Оповещения', link: '/ru/docs/notifications' },
        { text: 'Уже работающие программы', link: '/ru/docs/existing-programs' },
      ],
    },
    {
      text: 'Справка',
      items: [
        { text: 'Настройки', link: '/ru/docs/configuration' },
        { text: 'Безопасность', link: '/ru/docs/security' },
        { text: 'Устройство', link: '/ru/docs/architecture' },
        { text: 'Ограничения и статус', link: '/ru/docs/limitations' },
        { text: 'Лицензия и сторонние программы', link: '/ru/docs/license' },
      ],
    },
  ]
}

function sidebarEn(): DefaultTheme.SidebarItem[] {
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
  locales: {
    ru: {
      label: 'Русский',
      lang: 'ru-RU',
      link: '/ru/',
      description: 'Наблюдаемость для микросервисов в Kubernetes из одного описания системы',
      themeConfig: {
        nav: [
          { text: 'Документация', link: '/ru/docs/quick-start', activeMatch: '^/ru/docs/' },
          { text: 'Ограничения', link: '/ru/docs/limitations' },
          { text: 'Примеры', link: EXAMPLES },
        ],
        sidebar: { '/ru/docs/': sidebarRu() },
        outline: { level: [2, 3], label: 'На этой странице' },
        docFooter: { prev: 'Назад', next: 'Дальше' },
        darkModeSwitchLabel: 'Тема',
        lightModeSwitchTitle: 'Светлая тема',
        darkModeSwitchTitle: 'Тёмная тема',
        sidebarMenuLabel: 'Меню',
        returnToTopLabel: 'Наверх',
        langMenuLabel: 'Язык',
        skipToContentLabel: 'К содержимому',
        notFound: {
          title: 'Страница не найдена',
          quote: 'Такой страницы нет. Возможно, она переехала.',
          linkLabel: 'На главную',
          linkText: 'На главную',
        },
        footer: {
          message: 'Kamerton распространяется по лицензии AGPL-3.0-only.',
          copyright: '© 2026 The Kamerton Authors',
        },
      },
    },
    root: {
      label: 'English',
      lang: 'en-US',
      description: 'Observability for Kubernetes microservices from one system description',
      themeConfig: {
        nav: [
          { text: 'Docs', link: '/docs/quick-start', activeMatch: '^/docs/' },
          { text: 'Limitations', link: '/docs/limitations' },
          { text: 'Examples', link: EXAMPLES },
        ],
        sidebar: { '/docs/': sidebarEn() },
        outline: { level: [2, 3], label: 'On this page' },
        footer: {
          message: 'Kamerton is licensed under AGPL-3.0-only.',
          copyright: '© 2026 The Kamerton Authors',
        },
      },
    },
  },
  themeConfig: {
    logo: { src: '/logo.svg', alt: '' },
    siteTitle: 'Kamerton',
    socialLinks: [{ icon: 'github', link: CODE, ariaLabel: 'GitHub' }],
    search: {
      provider: 'local',
      options: {
        locales: {
          ru: {
            translations: {
              button: { buttonText: 'Поиск', buttonAriaLabel: 'Поиск' },
              modal: {
                displayDetails: 'Подробнее',
                resetButtonTitle: 'Сбросить',
                backButtonTitle: 'Закрыть',
                noResultsText: 'Ничего не найдено',
                footer: {
                  selectText: 'выбрать',
                  navigateText: 'перейти',
                  closeText: 'закрыть',
                },
              },
            },
          },
        },
      },
    },
  },
})
