import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Seearr',
  tagline: 'Lightweight media request manager for Radarr and Sonarr',
  favicon: 'img/favicon.ico',

  url: 'https://seearr.project516.dev',
  baseUrl: '/',
  trailingSlash: true,

  future: {
    faster: {
      swcJsMinimizer: true,
    },
  },

  organizationName: 'Project516',
  projectName: 'seearr',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          path: '../docs',
          editUrl: 'https://github.com/Project516/seearr/edit/master/docs/',
          docItemComponent: '@theme/ApiItem',
          async sidebarItemsGenerator({
            defaultSidebarItemsGenerator,
            ...args
          }) {
            const items = await defaultSidebarItemsGenerator(args);
            return items.filter(
              (item) =>
                !(
                  item.type === 'category' &&
                  item.label?.toLowerCase() === 'api'
                )
            );
          },
        },
        pages: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          seerr: {
            specPath: '../seerr-api.yml',
            outputDir: '../docs/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
            },
            downloadUrl:
              'https://raw.githubusercontent.com/Project516/seearr/master/seerr-api.yml',
            hideSendButton: true,
          } satisfies OpenApiPlugin.Options,
        },
      },
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      /**  @type {import("@easyops-cn/docusaurus-search-local").PluginOptions}  */
      {
        hashed: true,
        indexBlog: false,
        docsDir: '../docs',
        docsRouteBasePath: '/',
        explicitSearchResultPath: true,
      },
    ],
    'docusaurus-theme-openapi-docs',
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      logo: {
        alt: 'Seerr',
        src: 'img/logo_full.svg',
      },
      items: [
        {
          to: '/api/seerr-api',
          label: 'REST API',
          position: 'right',
        },
        {
          to: 'blog',
          label: 'Blog',
          position: 'right',
        },
        {
          href: 'https://github.com/Project516/seearr',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Documentation',
              to: '/',
            },
            {
              label: 'REST API',
              to: '/api/seerr-api',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/Project516/seearr',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Project516. Based on Seerr. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.shadesOfPurple,
      darkTheme: prismThemes.shadesOfPurple,
      additionalLanguages: [
        'bash',
        'powershell',
        'yaml',
        'nix',
        'nginx',
        'batch',
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
