import { defineConfig } from 'astro/config'

import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import icon from 'astro-icon'

import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import rehypeExpressiveCode from 'rehype-expressive-code'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import rehypeShiki from '@shikijs/rehype'
import remarkEmoji from 'remark-emoji'
import remarkMath from 'remark-math'

import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import type { ExpressiveCodeTheme } from 'rehype-expressive-code'

import tailwindcss from '@tailwindcss/vite'

import type { AstroIntegration } from 'astro'

// Every route below has zero locale-specific logic of its own — the shared
// component it renders reads Astro.currentLocale itself. Rather than
// maintaining a second physical file per route under src/pages/en/ (which
// already let /friends silently ship with no /en/friends counterpart),
// inject the /en/ routes directly at the same entrypoint via Astro's
// documented integration API. New routes only need one line added here.
function injectEnRoutes(): AstroIntegration {
  const routes = [
    { pattern: '/404', entrypoint: './src/pages/404.astro' },
    { pattern: '/about', entrypoint: './src/pages/about.astro' },
    { pattern: '/authors', entrypoint: './src/pages/authors/index.astro' },
    {
      pattern: '/authors/[...id]',
      entrypoint: './src/pages/authors/[...id].astro',
    },
    {
      pattern: '/essays/[...id]',
      entrypoint: './src/pages/essays/[...id].astro',
    },
    {
      pattern: '/essays/[...page]',
      entrypoint: './src/pages/essays/[...page].astro',
    },
    {
      pattern: '/notes/[...id]',
      entrypoint: './src/pages/notes/[...id].astro',
    },
    {
      pattern: '/notes/[...page]',
      entrypoint: './src/pages/notes/[...page].astro',
    },
    {
      pattern: '/notes/series/[...id]',
      entrypoint: './src/pages/notes/series/[...id].astro',
    },
    { pattern: '/tags/[...id]', entrypoint: './src/pages/tags/[...id].astro' },
    { pattern: '/tags', entrypoint: './src/pages/tags/index.astro' },
    { pattern: '/friends', entrypoint: './src/pages/friends.astro' },
  ]

  return {
    name: 'inject-en-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const { pattern, entrypoint } of routes) {
          injectRoute({ pattern: `/en${pattern}`, entrypoint })
        }
      },
    },
  }
}

export default defineConfig({
  site: 'https://blog.yuto0226.dev',
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !page.endsWith('/404') && !page.endsWith('/404/'),
    }),
    icon(),
    injectEnRoutes(),
  ],
  i18n: {
    defaultLocale: 'zh-TW',
    locales: ['zh-TW', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 1234,
    host: true,
  },
  devToolbar: {
    enabled: false,
  },
  markdown: {
    syntaxHighlight: false,
    remarkRehype: {
      clobberPrefix: 'user-',
    },
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['nofollow', 'noreferrer', 'noopener'],
        },
      ],
      rehypeHeadingIds,
      rehypeKatex,
      [
        rehypeExpressiveCode,
        {
          themes: ['github-light', 'github-dark'],
          plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
          useDarkModeMediaQuery: false,
          themeCssSelector: (theme: ExpressiveCodeTheme) =>
            `[data-theme="${theme.name.split('-')[1]}"]`,
          defaultProps: {
            wrap: true,
            collapseStyle: 'collapsible-auto',
            overridesByLang: {
              'ansi,bat,bash,batch,cmd,console,powershell,ps,ps1,psd1,psm1,sh,shell,shellscript,shellsession,text,zsh':
                {
                  showLineNumbers: false,
                },
            },
          },
          styleOverrides: {
            codeFontSize: '0.75rem',
            borderColor: 'var(--border)',
            codeFontFamily: 'var(--font-mono)',
            codeBackground:
              'color-mix(in oklab, var(--muted) 25%, transparent)',
            frames: {
              editorActiveTabForeground: 'var(--muted-foreground)',
              editorActiveTabBackground:
                'color-mix(in oklab, var(--muted) 25%, transparent)',
              editorActiveTabIndicatorBottomColor: 'transparent',
              editorActiveTabIndicatorTopColor: 'transparent',
              editorTabBorderRadius: '0',
              editorTabBarBackground: 'transparent',
              editorTabBarBorderBottomColor: 'transparent',
              frameBoxShadowCssValue: 'none',
              terminalBackground:
                'color-mix(in oklab, var(--muted) 25%, transparent)',
              terminalTitlebarBackground: 'transparent',
              terminalTitlebarBorderBottomColor: 'transparent',
              terminalTitlebarForeground: 'var(--muted-foreground)',
            },
            lineNumbers: {
              foreground: 'var(--muted-foreground)',
            },
            uiFontFamily: 'var(--font-sans)',
          },
        },
      ],
      [
        rehypeShiki,
        {
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
          inline: 'tailing-curly-colon',
        },
      ],
    ],
    remarkPlugins: [remarkMath, remarkEmoji],
  },
})
