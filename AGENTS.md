# Blog development guide

## Stack

- Astro 5 + Content Layer API: all pages are statically rendered.
- uniorg pipeline (uniorg-parse → uniorg-extract-keywords → uniorg-rehype → rehype-highlight): `.org` files are the only post source; there is no Markdown.
- Vite + native CSS + vanilla TypeScript: browser assets only.
- Pagefind: runs only after Astro has generated `dist/`.

## Environment

All commands run inside the Guix environment declared by `manifest.scm`:

```bash
guix shell --manifest=manifest.scm -- corepack pnpm <command>
```

Use `corepack pnpm` (never bare `pnpm` or `npm`) so the version pinned in `package.json` / `pnpm-lock.yaml` is used. `node_modules/`, `dist/` and `.astro/` are generated and ignored by Git.

## Commands

All commands are wrapped by `just` (see `justfile`), which runs every recipe inside the Guix environment with `corepack pnpm` so the pinned toolchain is always used:

```bash
guix shell --manifest=manifest.scm -- just dev       # Astro dev server on :4321
guix shell --manifest=manifest.scm -- just build     # astro build + pagefind → dist/
guix shell --manifest=manifest.scm -- just check     # astro check (types + diagnostics)
guix shell --manifest=manifest.scm -- just preview   # serve dist/ on :4321
guix shell --manifest=manifest.scm -- just install   # sync dependencies
guix shell --manifest=manifest.scm -- just new NAME  # scaffold an Org post
```

`corepack pnpm run test:e2e` runs the Playwright suite against `dist/` (builds first, then serves with `astro preview`).

## Content pipeline

`src/content/posts/*.org` is loaded by `src/loaders/org-loader.ts` (registered in `src/content.config.ts`). The loader:

1. globs `.org` files,
2. parses with `uniorg-parse`,
3. extracts `#+TITLE` / `#+DATE` / `#+FILETAGS` as front matter,
4. renders the body to HTML with `uniorg-rehype` + `rehype-highlight`,
5. stores the entry with a `rendered.html` field (read via `render()` in components).

Post IDs are derived from the file name and are also used as the URL slug. `#+DATE` must be an Org timestamp; `#+FILETAGS` is `:tag1:tag2:`. All `.org` files are treated as posts — never add non-post Org files to `src/content/posts/`.

### Org authoring rules

- Emphasis markers (`*bold*`, `/italic/`, `=code=`) must be followed by a space or English punctuation — never by CJK punctuation. This matches Emacs `org-element` behavior and uniorg's parser; see `docs/VERIFICATION.md`.
- Use `#+BEGIN_SRC <lang>` for code blocks; `rehype-highlight` needs a language on every block.
- Headings inside a post start at `*` and are shifted to `h2+` on render (the page has one `h1`).

## Licensing

The repository splits licensing by asset kind — do not blur the two:

- **Code** (Astro components, scripts, configs) → MIT, see `LICENSE`.
- **Post content** (`src/content/posts/*.org` and their rendered output) → Creative Commons Attribution 4.0 (CC BY 4.0), see `LICENSE-CONTENT.md`.

`CONTENT_LICENSE` in `src/consts.ts` holds the canonical name + URL; `ContentLicense.astro` is the only place that renders the on-page declaration. Keep the two in sync — change the constant, not the component. The declaration is a `position: fixed` overlay in the bottom-left that mirrors the corner globe in the bottom-right; it must not be folded back into the document-flow footer.

## Architectural boundaries

- `src/scripts/*.ts`: browser-side code, plain-Vanilla-TS, imported from `src/scripts/main.ts`. Globe, palette and search must stay decoupled from Astro component markup — they bind to `[data-*]` attributes only.
- `src/components/`: presentational Astro components. Post listing, article and taxonomy views are deliberately separate (PostCard / PostLayout / ArchiveList).
- `src/utils/excerpt.ts`: excerpt generation and heading normalization. Keep these pure — no Hexo helpers, no component imports.
- `src/consts.ts`: single source of truth for site metadata, menu, palette schemes and globe settings.
- `astro.config.ts` is the only Vite configuration surface (fonts, workers, base path). Do not add a separate `vite.config.ts`.

## Accessibility and motion

- Keep the skip link, landmarks and one page-level `h1`.
- Keep article content in ordinary document flow; never place it in an internal scroll container.
- Globe output is decorative and must remain `aria-hidden`.
- Respect `prefers-reduced-motion`; globe updates stop when reduced motion, hidden page, out-of-view or paused.

## Generated files

- `dist/` (Astro output + Pagefind index) is generated and ignored.
- `public/fonts/` ships the Departure Mono woff2; the CSS `@font-face` in `src/styles/main.css` references it via a public-path URL.

## Git conventions

- One commit per self-contained change; commit after each verified feature, do not batch unrelated work.
- Commit messages describe the change itself (subject + short body), never reference plan phases or task tracking artifacts.
- Do not touch the entries in `.gitignore`; new generated paths are added to it when they appear.
