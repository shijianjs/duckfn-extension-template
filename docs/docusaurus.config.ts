import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {remarkVersionPlaceholder} from 'duckfn-docs-kit/remark';
import {remarkRunnableSql} from 'duckfn-docs-kit/sql/remark';
import {dfkExtensions} from 'duckfn-docs-kit/sql/extensions';
import {dfkTocToggle} from 'duckfn-docs-kit/toc-toggle/plugin';
import {EXTENSION_VERSION} from './extension-version';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// ============================================================================
// 克隆模板后要改的就是这一段
//
// 仓库地址出现在导航栏的 Links 下拉、页脚与首页按钮上，所以只写一份、由下面各处引用，
// 而不是逐个页面硬编码。`my_extension` 那几处由 `just rename <新名字>` 自动改写。
//
// What to edit after cloning the template. The repository URL shows up in the navbar dropdown, the
// footer and the home page button, so it is written once and referenced everywhere else. The
// `my_extension` occurrences are rewritten by `just rename <new-name>`.
// ============================================================================
const REPO_URL = 'https://github.com/<owner>/<repo>';

// `dfkExtensions` 要的是 `owner/repo` 这个 slug，而不是完整 URL；从 REPO_URL 派生，占位符只写一份。
// 仍是占位符时（还没填 `<owner>/<repo>`）就不预加载扩展 —— 可运行 SQL 块照常渲染，只是点 Run 时
// 拿不到扩展函数。见下面 plugins 里的 preload 列表与 docs/README.md 的「Preloaded extensions」。
//
// `dfkExtensions` wants the `owner/repo` slug rather than the URL; deriving it here keeps the
// placeholder in one place. While it is still the placeholder the extension is simply not preloaded —
// the runnable SQL blocks still render, they just cannot call the extension's functions. See the
// `preload` list in `plugins` below and "Preloaded extensions" in docs/README.md.
const REPO_SLUG = REPO_URL.replace(/^https:\/\/github\.com\//, '');
const HAS_REPO = !REPO_SLUG.includes('<');

// GitHub Pages 把项目站挂在子路径下（https://<owner>.github.io/<repo>），所以 `url` / `baseUrl`
// 由工作流注入（见 ../.github/workflows/DeployDocs.yml）。下面两个是本地开发的兜底值。
//
// GitHub Pages serves a project site from a sub-path (https://<owner>.github.io/<repo>), so `url` and
// `baseUrl` are injected by the workflow (see ../.github/workflows/DeployDocs.yml); the values below
// are the local-development fallbacks.
const url = process.env.DOCS_URL ?? 'http://localhost:3000';
const baseUrl = process.env.DOCS_BASE_URL ?? '/';

const config: Config = {
  title: 'my_extension',
  tagline: 'A DuckDB extension written in Rust',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url,
  baseUrl,

  onBrokenLinks: 'throw',

  // GitHub Pages serves `<path>/index.html` at `<path>/`, and 301-redirects `<path>` to `<path>/`.
  // Keeping the slash in Docusaurus' own output means the sitemap, the canonical tags and every
  // internal link advertise the URL that answers 200 instead of a redirect hop. It only changes how
  // URLs are written; the files on disk and the client-side router behave the same, and slash-less
  // links keep working through the redirect.
  trailingSlash: true,

  // 客户端增强一律由 duckfn-docs-kit 的插件注入（见下面 plugins）：`dfkExtensions` 注册 `dfk-*` 元素，
  // `dfkTocToggle` 注入目录折叠控件 —— 本站因此不再需要 src/clientModules/ 里的自备文件。
  //
  // Client-side enhancements all come from the kit's plugins (see `plugins` below): `dfkExtensions`
  // registers the `dfk-*` elements and `dfkTocToggle` injects the TOC collapse control, so this site
  // keeps no src/clientModules/ files of its own.

  // English is the source language; every page under docs/ can be translated under
  // i18n/zh-Hans/. Add more locales here when needed.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
    localeConfigs: {
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en',
      },
      'zh-Hans': {
        label: '简体中文',
        direction: 'ltr',
        htmlLang: 'zh-Hans',
      },
    },
  },

  // 首页（src/pages/index.tsx）从 `siteConfig.customFields` 里读这两项，而不是再硬编码一份。
  //
  // The home page reads these from `siteConfig.customFields` instead of hard-coding them again.
  customFields: {
    repoUrl: REPO_URL,
    extensionVersion: EXTENSION_VERSION,
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Replaces the `{{EXTENSION_VERSION}}` placeholder with the version from
          // docs/extension-version.ts, so a release only has to update that one file.
          // Both plugins ship in duckfn-docs-kit; only the version value is site-specific.
          // `remarkRunnableSql` turns `sql {"type":"duckfn",…}` fenced blocks into
          // `<dfk-sql>` runnable examples (see docs/README.md).
          remarkPlugins: [
            [remarkVersionPlaceholder, {version: EXTENSION_VERSION, placeholder: '{{EXTENSION_VERSION}}'}],
            remarkRunnableSql,
          ],
          // Remove this to remove the "edit this page" links.
          editUrl: `${REPO_URL}/tree/main/docs/`,
          // Without this, translated pages link back to the English source in docs/docs/;
          // with it they point at the translated file under docs/i18n/<locale>/.
          editLocalizedFiles: true,
        },
        // No blog for now; switch this to an options object to enable one.
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  // The docs-kit wiring: `dfkExtensions` fetches this extension's released wasm file into
  // `static/duckdb-extensions/` at dev/build startup (cached locally, re-fetched only when the
  // release asset's sha256 changes), injects the ordered preload list into every page, and registers
  // the `dfk-*` elements; `dfkTocToggle` adds the TOC collapse control. Together they replace the
  // client modules this site used to keep under src/clientModules/.
  //
  // Runnable SQL blocks call the extension, so they need a GitHub Release to exist first: the file is
  // fetched from the repository's latest release, and `preload` stays empty until `REPO_URL` is filled
  // in (see docs/README.md, "Preloaded extensions").
  plugins: [
    dfkExtensions({
      // CI builds the release assets without DuckDB's signing keys — the same reason local
      // development runs `duckdb -unsigned`.
      allowUnsignedExtensions: true,
      preload: HAS_REPO
        ? [
            {
              // Served at <baseUrl>/duckdb-extensions/my_extension.duckdb_extension.wasm. The name
              // must keep `my_extension` before the first dot: that base is the entry symbol DuckDB
              // looks up, hence the rename from the release asset (which carries the wasm suffix).
              url: 'duckdb-extensions/my_extension.duckdb_extension.wasm',
              release: {repository: REPO_SLUG, asset: 'my_extension-wasm_eh.duckdb_extension.wasm'},
            },
          ]
        : [],
    }),
    dfkTocToggle(),
  ],

  // No `themes` entry for the search UI: the classic preset already registers
  // `docusaurus-theme-search-algolia`, and it turns on as soon as `themeConfig.algolia` below is
  // filled in — listing it again fails the build with
  // `Plugin "docusaurus-theme-search-algolia" is used 2 times with ID "default"`.
  themeConfig: {
    // Readers can collapse the docs sidebar away; the toggle button appears next to it.
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      // Same behaviour as docusaurus.io: the sticky navbar slides away once the reader scrolls down
      // past it, and slides back in on the way up. The theme already ships that animation as hashed
      // CSS-module classes on the <nav>, so this needs no CSS and no client module.
      hideOnScroll: true,
      title: 'my_extension',
      logo: {
        alt: 'my_extension logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          // All the project's external links live behind one dropdown, so the navbar keeps a
          // single slot no matter how many of them there are.
          type: 'dropdown',
          label: 'Links',
          position: 'right',
          items: [
            {label: 'GitHub', href: REPO_URL},
            {label: 'Releases', href: `${REPO_URL}/releases`},
            {
              label: 'Community extensions',
              href: 'https://duckdb.org/community_extensions/list_of_extensions',
            },
            {label: 'duckfn', href: 'https://shijianjs.github.io/duckfn/'},
          ],
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
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'Quick start',
              to: '/docs/getting-started/quick-start',
            },
            {
              label: 'Functions',
              to: '/docs/guide/functions',
            },
            {
              label: 'Build and release',
              to: '/docs/build-and-release',
            },
          ],
        },
        {
          title: 'Links',
          items: [
            {
              label: 'GitHub',
              href: REPO_URL,
            },
            {
              label: 'duckfn',
              href: 'https://shijianjs.github.io/duckfn/',
            },
            {
              label: 'DuckDB extensions',
              href: 'https://duckdb.org/docs/stable/extensions/overview',
            },
          ],
        },
      ],
      // 版权行按 HTML 渲染，所以这里不能出现尖括号占位符（`<owner>` 会被当成一个未闭合的元素，
      // 每页都会让 HTML 压缩器报错）。用扩展名占位，`just rename` 会一起改掉。
      //
      // The copyright line is rendered as HTML, so no angle-bracket placeholder belongs here: `<owner>`
      // would be read as an unclosed element and every page's HTML minification would complain. The
      // extension name is used instead, and `just rename` rewrites it.
      copyright: `Copyright © ${new Date().getFullYear()} my_extension contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'rust', 'sql', 'toml'],
    },

    // 搜索是可选的：本地搜索/托管搜索都行，但都需要先在 Algolia 上建一个 index（DocSearch 免费
    // 申请：https://docsearch.algolia.com/apply）。建好之后把下面这段的注释去掉、填上自己的值，
    // 并把静态页所用的 `duckfn_doc` index 换成你的 index 名。
    //
    // Search is optional and needs an Algolia index first (DocSearch is free:
    // https://docsearch.algolia.com/apply). Uncomment the block below, fill in your own values, and
    // set `algoliaIndexBaseUrl` to the sub-path the index was crawled from (usually `/<repo>/`).
    //
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',   // the public search key; safe to commit
    //   indexName: 'YOUR_INDEX_NAME',
    //   // The index URLs carry the GitHub Pages sub-path; a deployment served from a domain root
    //   // (`npm start`) has to drop it again, otherwise hits link to /zh-Hans/<sub-path>/...
    //   replaceSearchResultPathname: {
    //     from: '^/my_extension/',
    //     to: '/',
    //   },
    // },
  } satisfies Preset.ThemeConfig,
};

export default config;
