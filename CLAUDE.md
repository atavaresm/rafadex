# RafaDex

Kid-first Pokédex PWA (3–6 yo, non-reader) for iPhone via Add to Home Screen.
All 1025 Pokémon; UI is image/color/sound only, copy in pt-BR; repo artifacts in English.

## Commands
- `python3 build.py` — full pipeline: reads `/Users/amais/project/pokedex` (read-only),
  writes `data/dex.js`, `precache.js`, `assets/sprites/*`, `assets/cries/*` (all committed).
  `--force` re-converts media. Requires an ffmpeg with a WebP encoder (Homebrew's
  default `ffmpeg` formula lacks libwebp; `ffmpeg-full` has it; override binary via
  `RAFADEX_FFMPEG`).
- `pytest -q` — pipeline tests.
- `python3 -m http.server 8000` — local dev (PWA features need http, not file://).

## Architecture
- Vanilla JS, hash routing (`#home`, `#type/fire`, `#dex/25`, `#game`), data via
  `<script>` tags (`window.DEX`, `window.TYPES`) — never fetch() for data.
- `sw.js`: precache shell + Gen 1; runtime cache-on-demand; parent "download gen" control.
- Cries are `.m4a` because iOS Safari does not play `.ogg`.
- All URLs relative (GitHub Pages serves under `/rafadex/`).
- Python style: house STANDARDS (PascalCase/lowerCamelCase, no snake_case), ruff 100.

## Verification
Green tests are not enough: serve over LAN, open on the real iPhone, install,
airplane mode, verify browsing + all sounds. See spec + plan in docs/superpowers/.
