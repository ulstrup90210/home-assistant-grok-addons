# Changelog

## 1.1.0

- **Fix "410 Live search is deprecated" error.** Switched the AI engine from the
  unmaintained `@vibe-kit/grok-cli` (which still calls xAI's removed Live Search
  API) to the maintained `grok-dev` package, which uses the new Agent Tools API
  (`search_x` / `search_web`).
- Switched the base image to Debian (glibc) so `grok-dev`'s native `@opentui`
  binaries work, and install `ttyd` as a static binary.
- Dropped the `armv7` architecture (no native builds available for it).

## 1.0.0

- Initial release.
- Web terminal (ttyd) served through Home Assistant ingress.
- xAI Grok CLI (`@vibe-kit/grok-cli`) pre-installed and auto-launched.
- API key, model and max-tokens configurable via add-on options.
- `/config`, `/share` and `/ssl` mapped into the terminal.
- Home Assistant API exposed via `HASS_URL` / `HASS_TOKEN`.
