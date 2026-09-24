# Documentation site

Static site for this extension's documentation, built with
[Docusaurus](https://docusaurus.io/) and deployed by
[`.github/workflows/DeployDocs.yml`](../.github/workflows/DeployDocs.yml) to GitHub Pages.

The template ships a small bilingual site that already describes the sample functions. Once the
functions are yours, the pages under `docs/docs/` are yours to rewrite — or delete the whole directory
if you would rather not have a site (nothing else in the repository depends on it).

## Layout

| Path | Description |
| --- | --- |
| `docs/intro.md` | Introduction. The only page with a `slug`, so `/docs/intro` stays stable. |
| `docs/getting-started/` | Renaming the template, building and loading it, and the project layout. |
| `docs/guide/` | The sample functions line by line, and how to test your own. |
| `docs/build-and-release.md` | The two build paths, the release flow, the wasm target. |
| `docs/community-extension.md` | Publishing to DuckDB's community extensions. |
| `i18n/zh-Hans/` | Simplified Chinese translations of all of the above, plus the UI strings. |
| `src/pages/index.tsx` | Home page: hero, feature cards, the Rust/SQL showcase, and the "where to go next" cards. Every string is a `<Translate>` and has an entry in `i18n/zh-Hans/code.json` under `homepage.*`. |
| `src/components/icons.tsx` | The home page's inline SVG glyphs (Lucide and Simple Icons paths, quoted at the top of the file) — an icon package would be the only new runtime dependency on the landing page. |
| `src/css/custom.css` | Brand palette and theme overrides. The `--brand-*` tokens here are the single definition of the brand blue and accent yellow, so the home page never hard-codes a colour. |
| `static/` | Files copied to the site root (images, `favicon.ico`, `.nojekyll`). |
| `sidebars.ts` | Sidebar definition. Categories come from `_category_.json`; order from `sidebar_position`. |
| `docusaurus.config.ts` | Site configuration: `REPO_URL`, locales, navbar, footer, footer links. |
| `extension-version.ts` | The version shown in the docs. The only place it is written; `{{EXTENSION_VERSION}}` in the markdown is replaced from here at build time. |
| `plugins/remark-extension-version.ts` | The remark plugin doing that replacement. |
| `package.json` / `package-lock.json` | Dependencies. `package-lock.json` is committed: CI installs with `npm ci`. |

## What to change first

1. `REPO_URL` in `docusaurus.config.ts` — the navbar, the footer and the home page all read it from
   there (it is also handed to the home page as `customFields.repoUrl`).
2. `tagline` in `docusaurus.config.ts`, plus the copyright line in the footer and in
   `i18n/zh-Hans/docusaurus-theme-classic/footer.json`.
3. The logo: `static/img/logo.svg` is a placeholder, and the brand palette in `src/css/custom.css` was
   picked to match it — replace both together, or neither.
4. `static/img/docusaurus-social-card.jpg` (the preview image) and `static/img/favicon.ico`.
5. The pages under `docs/docs/` and their translations under
   `i18n/zh-Hans/docusaurus-plugin-content-docs/current/`.
6. Optional: search. See the commented `algolia` block in `docusaurus.config.ts`; DocSearch is free but
   needs an index (https://docsearch.algolia.com/apply).
7. One-time setup in the repository: Settings → Pages → Build and deployment → Source:
   **GitHub Actions**.

## Commands

```shell
npm install          # once
npm start            # dev server at http://localhost:3000
npm start -- --locale zh-Hans   # dev server, Chinese
npm run build        # static site into build/
npm run serve        # preview the build
npm run typecheck    # tsc
```

The `Justfile` wraps the first two (`just docs_build`, `just docs_start`) so the commands live next to
the extension's own.

`npm run build` is the check that matters: `onBrokenLinks` is set to `throw`, so a link to a page
that does not exist fails the build for both locales. The Deploy Docs workflow runs `npm run
typecheck` as well, which catches mistyped React props and type mismatches the build alone accepts.

## Markdown conventions

**Admonitions.** The opening directive goes on a line of its own and takes an optional title in
square brackets — a bare `:::note Title` does not render. The content always starts on the next line:

```md
:::note[Limitations]

- the first point
:::
```

Nesting works by using more colons for each level: `:::::info[Parent]` → `::::danger[Child]` →
`:::tip[Deep Child]`.

Two more things worth knowing: `onBrokenLinks` is `throw`, so every internal link and anchor has to
resolve (in both locales), and code fences should use one of the languages enabled for Prism in
`docusaurus.config.ts` — `bash`, `rust`, `sql` or `toml`.

**Version numbers.** Do not write a version by hand: write `{{EXTENSION_VERSION}}` (inside a code
fence or inline code, where the braces stay literal) and it is replaced at build time from
`extension-version.ts`. The value there is updated by `just release_bump`, so a release does not have
to touch the markdown at all.

## Translations

The site ships in English (`en`, default) and Simplified Chinese (`zh-Hans`). Routes are prefixed per
locale: `/docs/...` and `/zh-Hans/docs/...`.

A translated page is a full copy of its English source, placed under
`i18n/zh-Hans/docusaurus-plugin-content-docs/current/` with the same relative path:

- Translate the body and the reader-facing front matter (`title`, `description`).
- Keep `id`, `slug` and `sidebar_position` identical so both languages share routes and order.
- Link to other pages with **relative file paths** (`./project-structure.md`, `../guide/functions.md`).
  A hard-coded `/docs/...` link would send a Chinese page to the English one.

UI strings live in `i18n/zh-Hans/*.json`. After changing text in `docusaurus.config.ts`, in `src/`, or
a `_category_.json`, regenerate the stubs and fill in the new entries:

```shell
npx docusaurus write-translations --locale zh-Hans
```

`write-translations` keeps existing messages, so it only adds what is missing. Check afterwards that
the new entries it appends are translated, and that the manually written `homepage.*` entries in
`code.json` are still present — it warns about `homepage.tagline` because that one cannot be extracted
statically, which is expected.

Add another language by listing it in `i18n.locales` in `docusaurus.config.ts` and repeating the
steps above.
