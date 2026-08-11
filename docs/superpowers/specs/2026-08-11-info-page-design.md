# Info Page ("Sobre o Pokédex") — Design Spec

**Date:** 2026-08-11
**Status:** Approved design, pending implementation plan

## What

Now that the app is live on a public custom domain, add an "i" info icon next to the search icon on the Home screen's tool row. Tapping it opens a new full-screen page telling the app's origin story: it was made by Rafael's dad as a way to spend quality time with him, Rafael is a smart kid who loves Pokémon, the project is free for any parent/kid to use, and the source is open on GitHub — with a real link for browsing the code, filing bugs, or suggesting improvements.

This is the one deliberate exception to the app's house rule of zero reading-dependent UI (established since v1: Rafael is 3-6 and doesn't read yet, reaffirmed in `docs/superpowers/specs/2026-08-04-institutional-color-design.md`'s non-goals). That rule protects Rafael's ability to navigate the app; this page's entire *purpose* is a paragraph of prose for a different audience — the parents who now find the app at its public URL — so it's scoped as a one-off, not a precedent for adding text elsewhere.

## Content (approved verbatim)

Heading: **Por que esse app existe**

> Esse Pokédex nasceu de uma vontade simples: um pai encontrar mais um jeito de passar tempo de qualidade com o filho. O Rafael é uma criança muito esperta e curiosa, e vive apaixonado por Pokémon — folhear cada um deles, ouvir os sons, brincar de adivinhar quem é por trás da silhueta virou um dos nossos momentos favoritos juntos.
>
> Esse projeto é gratuito para qualquer pai, mãe ou responsável que queira fazer o mesmo com seus filhos. O código é todo aberto no GitHub: dá pra ver como foi construído, reportar um problema ou sugerir uma ideia nova.

Link/button: **Ver no GitHub →**, `href="https://github.com/atavaresm/rafadex"`, opens in a new tab (`target="_blank" rel="noopener"` — a new tab is correct here since navigating away in-place would lose the PWA's app state and hash-route history).

## Where it lives

- **Icon:** a third button in `renderHome()`'s `toolRow` (`app.js`), alongside the existing `.gear` (⚙️ downloads panel) and search (🔍) buttons. Same emoji-button pattern, same `.gear` CSS class (the class name is generic enough to reuse — it's a plain 44px circular icon button, not specific to the parent-download panel), `aria-label="Sobre o Pokédex"`.
- **Navigation:** a new hash route, `#info`, following the existing full-screen-route pattern (like `#game`) rather than the small in-Home panel pattern (like the search/gear panels) — the content is long-form prose, not a compact utility control, so it gets its own scrollable screen with a real back button via `topbar()`.
- **Header:** `topbar("ℹ️", "#home")` — no tint argument, so the body background falls back to the default `--bg` cream rather than a vivid type color. A plain cream background reads better behind a paragraph of text than any of the app's saturated tint colors.
- **Content card:** a white card (`var(--card)`, matching `.parent-panel`'s existing radius/shadow/padding) containing the heading, the two paragraphs, and the GitHub link styled as a button.

## Non-goals

- **No change to any existing screen's navigation, layout, or the `toolRow`'s existing two buttons** — this is a pure addition.
- **No new text anywhere else in the app.** This is a scoped, one-time exception for exactly one screen aimed at parents, not a reversal of the no-reading-required principle for Rafael's own navigation.
- **No dynamic content.** The story text is static prose, hand-written once, not pulled from any data file or the `pokedex` pipeline — there's nothing to template.
- **No analytics, tracking, or contact form** — just prose and one outbound link.

## Testing

- No Python/pipeline changes — this is a frontend-only addition (`app.js`, `style.css`, `index.html` untouched). No `pytest` additions.
- Live verification (house rule — green tests aren't enough for anything visual): serve locally, confirm the ℹ️ button appears next to 🔍 on Home, tapping it navigates to a full-screen page with a working back button, the heading/paragraphs render with the approved copy exactly, and the GitHub link opens `https://github.com/atavaresm/rafadex` in a new tab. Confirm the existing gear/search buttons and panels are unaffected.
- Per house rule, any `index.html`/`style.css` change needs a `python3 build.py` run before merge so `sw.js` gets a fresh precache version stamp.
- Per the new version-bump mechanism (`docs/superpowers/specs/2026-08-11-version-bump-enforcement-design.md`, shipping in parallel), this is a real user-visible feature — it needs its own `VERSION` bump (a minor bump: new feature, not a fix/tweak) as part of its release PR into `master`.
