# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

StreakForge turns GitHub contribution history into live 3D isometric "monolith" badges. The repo is a **Next 16 App Router** project being built **frontend-first** by porting six static design mockups in `design-reference/*.dc.html` into React routes. The mockups are the visual contract; the backend is added later, by the maintainer, file by file.

## Commands

- Dev: `npm run dev` (`next dev --webpack`)
- Build: `npm run build` (`next build --webpack`)
- Start: `npm run start`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint` · CSS lint: `npm run lint:css`
- Format: `npm run format` / `npm run format:check`
- Tests (Vitest): `npm test` · watch+UI: `npm run test:ui` · single file: `npx vitest run path/to/file.test.ts` · single test: `npx vitest run -t "name"`

**Keep the `--webpack` flag on dev/build.** It is required for native deps (`@resvg/resvg-js`, `lightningcss`, `sharp`-like binaries). Do not switch to Turbopack or add Turbopack config.

## Environment (hard)

- Node **>= 20.19**.
- Next 16 App Router. `params`, `searchParams`, `cookies()`, `headers()` are **async-only** — always `await` them.
- Tailwind v4 is installed (CSS-first, no `tailwind.config.js`) and may coexist, but **the design stays CSS-variable + inline-style based** (see below). Do not refactor ported markup into Tailwind utilities.

## REPO STRUCTURE (binding for every future file)

- **`lib/`** — **low-level backend utilities** ONLY: caching, calculations, database, crypto, rate-limiting, external API wrappers/clients. Never page data, never React components, never UI logic. If a new `lib/` file isn't a low-level backend utility, it's in the wrong place — stop and ask.
- **`services/`** — top-level directory (sibling to `lib/`, `app/`, `components/`), **sanctioned category**. Holds **higher-level orchestration/integration logic** that composes `lib/` utilities into feature-level behaviour (e.g. `services/github/quota-monitor`, `services/github/refresh-policy`, `services/security/track-user-protection`). This mirrors the original commitpulse architecture (there `services/` is its own top-level dir, not under `lib/`). **The `lib/` vs `services/` split:** `lib/` = low-level backend *utilities* (caching, crypto, db clients, rate-limiting, external-API wrappers); `services/` = feature-level logic that *uses* those utilities. Both are backend-only — no React/UI, no page data. **If you're not fully confident whether a specific new backend file is a `lib/` utility or a `services/` orchestrator, flag that file and ask — do not guess.**
- **API routes** live at `app/api/<name>/route.ts`. Route-specific backend helpers may be **colocated in the route folder** (e.g. `app/api/streak/validation-cache.ts`) — an **accepted exception** to the "caching/backend logic lives in `lib/`" rule, matching the original repo's pattern of keeping route-specific helpers next to their route.
- **Home (index route)** lives at the app root with no subfolder: a **thin server `app/page.tsx`** (metadata/SEO only) that renders **`app/HomeClient.tsx`** (`'use client'`, all logic/state) — matching the `page.tsx` + `<Feature>Client.tsx` pattern used by every other route (do not put Home's live logic inline in `page.tsx`). Home's data lives in `app/data/home.ts`, never `lib/`.
- **Every other top-level route** gets its own folder directly under `app/`: `app/compare/`, `app/generator/`, `app/customize/`, `app/burnout-analyzer/`, `app/dashboard/`. Each folder contains exactly:
  - `page.tsx` — thin server component, metadata/SEO only, renders the Client component.
  - `<Feature>Client.tsx` — `'use client'`, holds the full ported design markup, state, and interactivity for that page (e.g. `CompareClient.tsx`, `GeneratorClient.tsx`, `CustomizeClient.tsx`, `BurnoutAnalyzerClient.tsx`, `DashboardClient.tsx`). All porting fidelity rules (verbatim markup, inline styles, DCLogic → hooks) apply here without exception.
  - `components/` — components used ONLY by this page, extracted from the Client file for readability/reuse within that page.
  - `data/` — **static data and view-model mappers only** (e.g. `dashboard/data/overview.ts`, `customize/data/themes.ts`, `generator/data/presets.ts`). No hooks.
  - `hooks/` — **the page's client hooks** (`use*.ts`): `dashboard/hooks/useDashboardData.ts`, `compare/hooks/useCompare.ts`, `customize/hooks/useBadgeSvg.ts`, `burnout-analyzer/hooks/useBurnout.ts`, `generator/hooks/useGithubProfile.ts`. Distinct from top-level `hooks/`, which is for hooks shared across 2+ pages (`useTheme`, `useUrlParams`, `useRecentList`).
  - `utils/` — pure page-specific helpers, colocated.
  - `types.ts` — **always at the route root**, never `data/types.ts`.
- **Top-level `/components`** (sibling to `app/`, not nested inside it) holds ONLY components reused across 2+ pages — currently `Hover.tsx`, `Avatar.tsx`, `ContributionHeatmap.tsx`, `LoadingPanel.tsx`. A component used by exactly one page belongs in that page's `app/<feature>/components/`, not here.
- **Before creating any new file**, check this section. If its placement doesn't clearly match one of these categories, ask instead of guessing.

### Comment policy (binding, applied repo-wide 2026-08-23)

The repo is deliberately comment-light. Do **not** reintroduce explanatory prose, section dividers, or JSDoc on trivial functions; names and types carry the meaning. Short (4–5 word) comments are kept **only** at load-bearing operations: cache read/write, database connection setup, external API/data fetch calls, rate limiting, and a small number of genuine footguns (the pre-paint theme boot script; the `<html>.dark` sync; the canvas-vs-SVG constraint behind the dashboard Time-Lapse export; the `RESTING_BORDER` reset; the Customize theme table that mirrors `lib/svg/themes.ts`). Directive comments (`eslint-*`, `@ts-*`, `prettier-ignore`) are functional — never strip them.

**When stripping comments, whitespace inside template literals, strings, regex literals and JSX text is OFF LIMITS** — an SVG generator's template whitespace *is* the bytes it emits. Verify any bulk edit by comparing parsed AST shape (excluding JSDoc nodes) before and after.

## DESIGN SYSTEM — pixel contract (non-negotiable)

The `<style>` block at the top of the `.dc.html` files is the **source of truth**. It lives **ONCE in `app/globals.css`** and is never altered, renamed, reordered, or "cleaned up."

The six pages' `<style>` blocks are _not_ byte-identical and they **conflict** (not just add): in the original mockups `[data-reveal]` was animated on Home/Compare/Studio/Burnout but `opacity:1`/always-visible on Dashboard/Generator (and Generator had no `initReveal`, so a global animated rule hid its content forever); Burnout overrides `--hbase`/`--hsweep`; `.hov-card` and some `sf-*` keyframe timings differ per page. A single flat global file therefore cannot hold them all. The model is **"core once + page-scoped blocks at port time"**: _(NOTE — the per-page `[data-reveal]` divergence has since been **deliberately unified**; every page now uses the one core reveal rule + the shared `initReveal`. See **POST-PORT CONVENTIONS** below. The `--hbase/--hsweep`, `.hov-card`, keyframe and other per-page blocks still follow the core+scoped model.)_

- `app/globals.css` holds the **shared core verbatim, written once** (resets, fonts, the full `:root`/`.dark` token sets, the 9 core `sf-*` keyframes, the core `[data-reveal]`/`.sf-link`/`.nav-burger`/nav `@media`/`.sf-input` helpers). This is already in place — do not rewrite it.
- Each page's **own** tokens (`--pa..--pe`, `--good/warn/bad/info`), extra keyframes (`sf-grow/orbit/flow/fill/bar`), scoped helpers (`.gnode`, `.list-scroll`, `.collapse-body`, `.sf-sel`, `.sf-field`, range inputs, `.hov-row`, `.marq`, `.tbl-scroll`, per-page `@media`), and **overrides** (Burnout `--hbase/--hsweep`, page-specific `.hov-card`) are added **scoped under that page's wrapper class** when the page is ported — never flattened into the global `:root` or a bare selector. Still verbatim values; just namespaced. Drop nothing. (Per-page `[data-reveal]` overrides are the one exception — they were removed to unify the reveal animation; see **POST-PORT CONVENTIONS**.)

Shared core already in `app/globals.css` (from every file):

- Resets: `*{box-sizing}`, `html{background:#f0ebe1}`, `body{font-family:'Newsreader',Georgia,serif;color:#1c1813;...}`, and `button`/`input`/`a` resets.
- **Fonts (3):** `Newsreader` (body serif, weights 400/500/600 + italic 400) · `Space Grotesk` via **`.ui`** (UI sans, 400/500/600/700) · `JetBrains Mono` via **`.mono`** (400/500/700). Loaded from Google Fonts `display=swap`.
- **Tokens — full `:root` (light) and `.dark` sets** (warm cream + electric blue light; near-black + green dark). Copy verbatim; never rename or round:
  - `:root`: `--bg:#f0ebe1; --bg2:#e8e1d3; --surface:rgba(255,255,255,.55); --surface2:rgba(255,255,255,.78); --text:#1c1813; --soft:#6d6456; --faint:#928876; --line:rgba(28,24,19,.13); --line2:rgba(28,24,19,.08); --accent:#2f5fff; --accent-ink:#2563eb; --accent-2:#b1703c; --dot:rgba(28,24,19,.17); --dot-hot:#2f5fff; --hbase:#2563eb; --hsweep:#19d86b; --hlight:#cfe0ff; --stage:#100e16; --stage2:#08070b; --stage-line:rgba(255,255,255,.08); --stage-text:#efeaf2; --stage-soft:#9a93a8; --shadow:0 1px 2px rgba(28,24,19,.06),0 12px 40px -18px rgba(28,24,19,.22);`
  - `.dark`: `--bg:#0a090e; --bg2:#131119; --surface:rgba(255,255,255,.035); --surface2:rgba(255,255,255,.06); --text:#f2eee7; --soft:#9b9488; --faint:#6f6a60; --line:rgba(255,255,255,.09); --line2:rgba(255,255,255,.05); --accent:#19d86b; --accent-ink:#5cf08a; --accent-2:#d0925b; --dot:rgba(255,255,255,.11); --dot-hot:#19d86b; --hbase:#19d86b; --hsweep:#2f5fff; --hlight:#d6f7e6; --stage:#0c0a12; --stage2:#070609; --stage-line:rgba(255,255,255,.07); --stage-text:#f2eef7; --stage-soft:#938ca3; --shadow:0 1px 2px rgba(0,0,0,.4),0 24px 60px -24px rgba(0,0,0,.7);`
- **Keyframes `sf-*`:** `sf-fadeup, sf-shimmer, sf-rise, sf-float, sf-ticker, sf-pulse, sf-spin` (core) plus page additions `sf-grow, sf-orbit, sf-flow, sf-fill, sf-bar`. Keep every variant. _(`sf-glow` and `sf-scan` were in the original core set but have been **removed** from `globals.css` — they were home-only page chrome layered over the demo badge, deleted per an explicit design decision. Do not re-add them; the badge's own internal animations (`scan-sweep` divider + `grow-up` tower entrance, in `lib/svg`) are the intended motion.)_
- **Helpers:** `[data-reveal]` / `[data-reveal].in`, `.sf-link` + `::after` underline sweep, `.nav-burger`, `.sf-input::placeholder`, and the `@media(max-width:940px)` nav rules (`.nav-links`/`.nav-repo` hidden, `.nav-burger` shown).

Per-page **additions** that must also be merged into `globals.css` (do not invent, copy from each file's block):

- Extra tokens: `--pa..--pe` (palette/persona, Dashboard/Compare), `--good/--warn/--bad/--info` (status, Generator/Burnout), `select`/`textarea`/range-input element styles.
- Scoped helper classes: `.hov-card`, `.gnode`, `.list-scroll(+::-webkit-scrollbar)`, `.collapse-body`, `.sf-sel`, `.sf-field`, `input[type=range]` thumbs, `.hov-row`, `.marq`/`.marq-track`, `.tbl-scroll`/`.tbl-inner`, and each page's own `@media` breakpoints (1080/1000/900/760/720px, `prefers-reduced-motion`).

**One real conflict:** Burnout Radar overrides `--hbase`/`--hsweep` (to `#2563eb`/`#7c3aed` light, `#19d86b`/`#a855f7` dark). This cannot be flattened into the single global `:root`/`.dark`. Scope it to the Burnout page only (page-wrapper class or inline style on its hero), not by mutating the global tokens.

### Porting fidelity rules

- Copy markup and **every inline `style="..."` VERBATIM** as `style={{}}`. Never convert inline styles to Tailwind, never round pixel/color/opacity values, never substitute or rename a token.
- `style-hover="..."` and `style-active` attributes in the mockups are DC pseudo-state hints; reproduce them with React hover state or an equivalent `:hover` helper class already defined in `globals.css` (`.hov-card`, `.sf-link`, etc.) — preserve the exact transition/transform/color values.
- **Colors come only from the defined CSS variables.** Introduce no new colors. _(Named, scoped exception: the **Compare page's activity heatmap** uses **GitHub's own 5-step contribution palette** — `#ebedf0/#9be9a8/#40c463/#30a14e/#216e39` light, `#161b22/#0e4429/#006d32/#26a641/#39d353` dark. That graph is meant to read as GitHub's real contribution grid, so it is deliberately NOT reconciled into `--accent`. The exception is scoped to that one component (`HeatMap` in `app/compare/CompareClient.tsx`) — do not spread this palette elsewhere, and do not "fix" it back to a token color-mix.)_ Note: `--accent` is the brand identity (electric blue `#2f5fff` light / green `#19d86b` dark) — never violet/magenta for the accent. The violet/magenta/pink values that _do_ appear (logo art `#B14AED`/`#6A0DAD`, `--pa`/`--pb`, Burnout `--hsweep`, the `Brand` city palette `#ff6cbb/#cf2188/#7c1a5c`) are part of the verbatim mockup contract and stay exactly as-is; the "no new colors" rule means add none beyond what the mockups already define.
- **Logos** are `public/streakforge-logo-light.svg` and `-dark.svg` (text fill `#1A1024` vs `#FFFFFF`). Swap by theme. Use these files in place of the inline nav/footer logo SVG markup.

## PORTING RULES

Each `.dc.html` becomes a **`'use client'`** component at its route:

| Mockup                | Client file (port target)                        | Server shell                    |
| --------------------- | ------------------------------------------------ | ------------------------------- |
| StreakForge Home      | `app/HomeClient.tsx`                              | `app/page.tsx`                  |
| StreakForge Dashboard | `app/dashboard/DashboardClient.tsx`              | `app/dashboard/page.tsx`        |
| StreakForge Generator | `app/generator/GeneratorClient.tsx`              | `app/generator/page.tsx`        |
| StreakForge Compare   | `app/compare/CompareClient.tsx`                  | `app/compare/page.tsx`          |
| Customization Studio  | `app/customize/CustomizeClient.tsx`              | `app/customize/page.tsx`        |
| Burnout Radar         | `app/burnout-analyzer/BurnoutAnalyzerClient.tsx` | `app/burnout-analyzer/page.tsx` |

- **Discard `support.js` and `DCLogic`** (no `support.js` exists in the repo; the `.dc.html` `<script>` tail is reference only). Rewrite each `class Component extends DCLogic` as a native React component (function + hooks, or class), **preserving state shape, refs, lifecycle, and every imperative renderer exactly** so visuals/interactions are byte-faithful. Imperative pieces to port faithfully include: `initGrid` (canvas dot-field with mouse warp + click ripples + `--dot`/`--dot-hot` colors, `componentWillUnmount` cleanup), `initReveal` (IntersectionObserver adding `.in`, honoring `prefers-reduced-motion`), `isoPolys`/`cityEl`/`buildCitySVG` (seeded isometric SVG monolith with `sf-rise` stagger), Dashboard graph pan/zoom/inertia (`graphDown/Move/Up`, `cityWheel`, `_applyPan`, `_cityInertia`), and per-page math helpers (`hash`, `mulberry`, `stats`, `analysis`, `profile`, `battle`).
- `{{ binding }}` markers map to React state/refs/handlers (see each file's `renderVals()` for the mapping). `onClick="{{ fn }}"` → `onClick={fn}`, `ref="{{ x }}"` → `ref={x}`, `class="..."` → `className="..."`, `style-hover` → hover handling.
- The DC `data-props` editor knobs (`cityPalette`, `monolithHeight`, `gridReactivity`) become typed component constants/props with the same defaults (e.g. `gridReactivity` default `1.2`).
- Theme is `class` on the page root: `'sf'` / `'sf dark'`. The light/dark choice is **shared across routes** via the `useTheme` hook (`hooks/useTheme.ts`): every page does `const [theme, toggleTheme] = useTheme()` instead of a local `useState` — the hook persists the choice to `localStorage` (`sf-theme`) and re-reads it on mount so navigating between pages keeps the theme. SSR + first client render still start from `"light"` (the stored value is applied in an effect) to avoid hydration mismatch. New pages MUST use this hook, never a local theme `useState`. See **POST-PORT CONVENTIONS**.

### Source-repo rename convention (commitpulse → streakforge) — BINDING, automatic

Parts of this codebase are ported from the original author's sibling repo **`github.com/JhaSourav07/commitpulse`** (StreakForge is a rebrand of the same project). **Every time** code is ported from that source — no need to be told again — rename **all** occurrences of the product name `commitpulse` to `streakforge`, matching the original case style, as a standard automatic step of porting. This applies to code, comments, strings, identifiers, class names, CSS custom properties, and internal ids alike:

| source form   | rename to     |
| ------------- | ------------- |
| `commitpulse` | `streakforge` |
| `CommitPulse` | `StreakForge` |
| `COMMITPULSE` | `STREAKFORGE` |
| `commitPulse` | `streakForge` |
| `commit-pulse`| `streak-forge`|
| `commit_pulse`| `streak_forge`|

- **Re-ports count, not just first ports.** This applies to **any file pulled or updated from the commitpulse source at any time** — including re-fetches/updates of files that were _already_ ported. Re-pulling a file from source reverts the rename, so the rename MUST be re-applied in the same change and re-verified afterward. (Precedent: `lib/svg/generator.ts` was re-ported and silently reverted 305 `cp-` + 5 `CommitPulse` occurrences — which also broke the `.sf-tower` vs `.cp-tower` tower-animation wiring — before being re-fixed. Always grep any freshly re-pulled file for `commit[-_ ]?pulse` and `\bcp-` before considering the port done.)
- **Abbreviations count too.** The internal `cp-` id / CSS-var prefix in `lib/svg` (`cp-title`, `--cp-accent`, `.cp-tower`, …) abbreviates CommitPulse and is renamed to `sf-` (`sf-title`, `--sf-accent`, `.sf-tower`). Rename each id/var together with every reference to it so definitions and usages stay paired.
- **Don't rename incidental letter matches.** Only the product name (and its `cp-` abbreviation) is renamed — tokens that merely contain the letters are left alone, e.g. bezier **control-point** vars `cp1x`/`cp2y` ("control point", not CommitPulse).
- **Exception — genuine external references are NOT renamed:** an actual attribution/provenance link or citation pointing at the original `github.com/JhaSourav07/commitpulse` repo (for history/credit) stays verbatim. If you encounter one, **flag it and ask** rather than rewriting it.

### Out-of-scope: lines-of-code (BINDING)

Lines-of-code is **not** a StreakForge feature line. The Compare page's "Code Volume" section was removed on 2026-08-14 along with every user-facing derivation from it: `derivePersona` no longer has a "The Refactorer" branch, and `deriveRadar`'s Volume axis is contribution count alone. `CompareActivityPayload` deliberately carries no `locAdditions`/`locDeletions`. `lib/github`'s `ContributionDay` still declares those fields (they are part of the upstream calendar shape and the badge's LoC mode) — leave them there, but do not surface or derive from them again.

### Out-of-scope: educational / student features (BINDING)

StreakForge does **not** implement educational or student-oriented features. The commitpulse source contains a student/education subsystem — `lib/educational/*` (e.g. `syllabus-mapper`, `AcademicDomain`), `types/student.ts` (`StudentProfile`, learning-curve / study-streak / academic-domain types), resume parsing (`lib/resume-parser.ts` → `ParsedResume`), and any related routes/pages/components. **None of this is in scope.** Do **not** port these files now or in any future re-port pass, regardless of what exists in the source repo, and do not add references to them. (`resume-parser.ts` and `types/student.ts` had been ported earlier but were **removed** on 2026-07-25 and are permanently excluded; there is intentionally no `lib/educational/`.)

## POST-PORT CONVENTIONS (binding — these intentionally refine the verbatim mockup contract)

These conventions were applied across all pages after the initial port. They **override** the corresponding original-mockup behaviour and any new page/file MUST follow them so consistency holds.

1. **Shared theme persistence + no-flash boot.** Use `useTheme()` from `hooks/useTheme.ts` (returns `[theme, toggleTheme]`) on every page — never a local theme `useState`. It mirrors the choice to `localStorage` (`sf-theme`) and re-reads on mount, so the light/dark choice carries across `<a href>` navigations. `hooks/` is the home for shared **client** hooks like this one (not `lib/`, which stays backend-only). To stop a light→dark flash on each navigation, `app/layout.tsx` runs a tiny **blocking boot script** in `<head>` that adds the `dark` class to `<html>` from `localStorage` _before first paint_ (the dark tokens then cascade instantly), and `<html>` carries `suppressHydrationWarning`. The hook keeps that `<html>.dark` class in sync (imperatively, on mount + toggle — never via a `[theme]` effect, which would flash). **Do not remove the boot script, the `suppressHydrationWarning`, or the hook's `applyHtmlThemeClass` sync** — any one of them reintroduces the flash. The per-page wrapper still keeps its own `sf dark` class (needed for compound selectors like `.burnout.dark`).

2. **One unified reveal animation.** Every page uses the single core `[data-reveal]` rule in `globals.css` (opacity 0 → 1, `translateY(28px)` → none, `.85s`) plus the standard `initReveal` routine (immediate reveal of in-view elements via `requestAnimationFrame`, an `IntersectionObserver` for the rest, and a `~1200ms` failsafe that reveals everything). The per-page `.gen/.dashboard/.customize/.burnout [data-reveal]` overrides were **removed** — do not re-add them. Any new `data-reveal` element just works as long as the page runs `initReveal` (see Home/Compare for the reference implementation). `prefers-reduced-motion` still reveals everything immediately (global rule + the `reduce` branch in `initReveal`).

3. **Empty preview state (Home).** With no username entered, the Home generator shows an **empty base** monolith (every cell height 0, no towers), the stage corner reads `@preview`, and all stats are `0`. This is driven by the data layer: `useHomeStats("")` returns all zeros, and `isoPolys` forces height 0 when the (trimmed) username is empty. Real data only appears once a username is entered — the future GitHub API wiring replaces ONLY the data-layer body, not the view.

4. **Canonical nav/footer links.** Home is the source of truth for shared links; all pages match it: Repo `https://github.com/Subhooo5/StreakForge` (nav "GitHub Repo", mobile menu, footer "Repository"); GitHub profile `https://github.com/Subhooo5` (footer "GitHub" + bottom icon); Discord `https://discordapp.com/users/488670412096667648`; X/Twitter `https://x.com/SiMpL36969`; LinkedIn `https://www.linkedin.com/in/subho1817/`; "Documentation" stays `#` until docs exist. External links open in a new tab (`target="_blank" rel="noopener"`). The internal route links (`/generator`, `/compare`, `/burnout-analyzer`, `/customize`, `/dashboard`, `#top`) were already correct.

5. **Uniform navbar width.** The sticky `<header>` `<nav>` and its mobile-menu dropdown use `maxWidth: 1240px` on **every** page (matching Home), so the logo and the right-side buttons (GitHub Repo / theme toggle / burger) land in the same screen position across routes. Some mockups shipped the nav at `1320px` (Generator/Customize/Dashboard) — that was corrected to `1240px`. A page's `<main>` body may still use its own width (e.g. `1320px` for the wider builder/dashboard layouts); only the **navbar** is pinned to `1240px`.

6. **Nothing on any page is pinned while scrolling — this is DESIRED, not a bug.** Every page root carries **`overflowX: 'hidden'`**. CSS resolves `overflow-x: hidden` (with a visible `overflow-y`) to `overflow-y: auto`, which makes that wrapper a scroll container, so **every `position: sticky` inside it is inert**. The result is the intended behaviour and MUST be preserved:
   - The **navbar scrolls away** with the page and comes back when you scroll up. It is **not** pinned to the top. The `position: 'sticky', top: 0` on `<header>` is verbatim ported markup that is deliberately left non-functional — **do not "fix" it.**
   - The Generator's **two builder columns are both static** with respect to the page. The `position: 'sticky', top: '96px'` on the right-hand preview column is likewise inert by design.
   - **Never change `overflowX` on a page root to `clip`, `visible`, or anything else**, and never add a scroll-container-breaking workaround (`align-self: stretch` on the grid item, a measured sticky offset, a `.preview-rail` wrapper, `position: static` overrides). Every one of those re-enables pinning and was explicitly rejected. If a future task needs horizontal-overflow containment, keep `hidden`.
   - Legitimate layout fixes in this area are limited to ones that do **not** alter scroll behaviour — e.g. `minWidth: 0` on grid items to stop a wide descendant (code blocks, long tables) from sizing a track. Those are fine.

7. **URLs are query params, never dynamic path segments.** Every route addresses its subject the way `/api/streak` and `/api/dashboard` already do — `?user=` on Home, Generator, Customize and Dashboard, `?repo=` on Burnout Radar (it analyses a repository, not a user), and `?user1=&user2=` on Compare. There is deliberately **no `app/dashboard/[username]/`**, even though the commitpulse source has one: a dynamic segment would break the "each route folder contains exactly `page.tsx` + `<Feature>Client.tsx` + `components/`" rule above and force every internal link to change, for no gain over the param the rest of the app already uses. Shared client hooks live in `hooks/useUrlParams.ts`:
   - `useUrlBackedState(key)` — a `useState<string>` mirrored into one param, debounced with `replaceState` so typing a handle leaves ONE history entry.
   - `useUrlMirror(key, value, adopt)` — same, for a value that must stay inside a bigger state object (the Generator's `state.githubUsername`).
   - `useUrlParams(keys)` — read/write several params, with `push` for real navigations.

   All three read/write `window.history` rather than `useSearchParams()`, so the page routes stay statically renderable (no Suspense boundary) and Back/Forward work via `popstate`. **Compare's URL is the source of truth for its results**: `/compare` is the battleground, `/compare?user1=X&user2=Y` is a showdown, starting a battle *pushes* those params and an effect performs the fetch — so deep links, refresh, Back (returns to the bare battleground) and Forward all take one code path. `app/compare/page.tsx` is the one route with `generateMetadata` reading `searchParams` (async — always `await`), titling shared links with the matchup; the other routes keep static metadata so they are not deopted to dynamic rendering.

8. **Hover borders reset to their token, never to `''`.** Controls that swap `borderColor` to `var(--accent)` on hover (Customize's nav/repo/theme-toggle/export buttons) must restore `var(--line)` explicitly on leave. Clearing the property removes the longhand the `border` shorthand wrote, so the border falls back to its CSS initial value — `currentColor`, a white outline in dark mode that lingers after the pointer leaves. Home, Dashboard, Compare and Burnout avoid this by driving hover through React state objects that name both states; Customize uses the imperative path and the `RESTING_BORDER` constant.

9. **`Hover` is a shared component.** `components/Hover.tsx` is the single implementation used by all five pages that need pointer-driven inline styles; `app/generator/components/ui.tsx` re-exports it for its siblings. Do not re-add a local copy.

## UI CHANGE POLICY (binding)

**Never change existing UI or interaction behaviour that was not explicitly requested.** This includes scroll/pin behaviour, animation timing, spacing, element order, hover/focus states, and anything else a user would notice. Precedent: a fix for the Generator's two-column layout switched the page roots from `overflow-x: hidden` to `clip`; that incidentally made the navbar pin to the top on all six pages and turned the Generator's preview column into a sticky rail. Neither was asked for, and both had to be reverted.

### No state change may move an unrelated section (BINDING)

**No state change — toggle, filter, refresh, tab switch — may ever shift, resize, or reposition a section unrelated to it.** A container must reserve the same height in its loading and loaded states, and a re-fetch must never unmount a section that already has data.

- Prefer an **in-place skeleton or spinner overlay inside the existing-sized container** over swapping the container out for a loading panel. See the Burnout Radar results body: a bot-filter toggle or refresh keeps every section mounted and overlays a "Recalculating…" pill, so `document.scrollHeight` is byte-identical before, during and after.
- Where a card's content genuinely varies with the filter (the Burnout Radar's AI recommendations list), cap it with a scroll container so it cannot drive the row height. Precedent: that list shrank the Risk Assessment pair from 487px to 397px on every toggle and pulled "Recommended Actions" up 90px.
- Paired cards get equal height from the grid's default `stretch`, never a hardcoded pixel height — that keeps a data-light repository from leaving an empty box while still holding both cards level.
- When a bug's root cause sits **underneath** shared behaviour, fix only the reported symptom. Do not "also fix" adjacent behaviour you discover along the way, even when it looks broken or looks like a latent bug — **flag it and ask first**.
- If a fix would change how any page behaves beyond the reported symptom, stop and confirm before applying it.
- Treat the six ported pages' scroll, layout and motion behaviour as the contract. Prefer the narrowest change that resolves the report.

## TESTING POLICY (binding)

Write whatever tests are useful while working, then **always delete every `*.test.*` / `*.spec.*` file from the repo before reporting the task done**. The repo intentionally ships with no test files. Verify with `npx tsc --noEmit`, the dev server, and throwaway scripts in the scratchpad directory instead — none of that lands in the repo.

## DATA + BACKEND RULES

- **Markup/styles are the contract; DATA is not.** Never hardcode usernames, repo lists, or stats in JSX. The mockups' seeded fake data (`hash`/`mulberry`/`stats`) is placeholder. Each page reads data through a **typed hook/prop that currently returns a typed stub**. Wiring those stubs to real API routes is a **separate, later task that touches only the data layer**.
- This project starts **frontend-only**. Backend work added later must **NEVER modify, restyle, or "improve" any ported frontend file or `app/globals.css`.** If backend needs a shape change, change the data-layer hook/type, not the view.
- **ONE data route: `app/api/streak/route.ts`.** It serves **both** the badge SVG (default) **and** page data (`?format=json`) from the same fetch → calculate → generate pipeline. Do **not** add parallel/duplicate data routes (a previous `app/api/user-stats` was removed for this reason). The Home page (and any live preview) consumes this single route — the badge `<img>` hits `/api/streak?user=…`, and the live stats/verified/repo data come from `/api/streak?user=…&format=json` (the JSON payload carries `stats` + a best-effort `profile` = login/name/avatar/repos). Real, cached, rate-limited data only — no mock/seeded values in this path.
- **Sanctioned exception — minimal error affordances in views.** Surfacing a clear invalid-username error state (distinct from the legitimate empty preview) may add a **small, contained** error element to a ported view. This is an explicit, narrow exception to "never modify ported view files," approved for the real-data wiring — keep it minimal and use existing tokens (`--bad`, etc.).
