# Changelog

## 1.2.0

- **Replaced the third-party Grok CLI with a built-in, dependency-free Node.js
  assistant.** The previous engines either called xAI's removed Live Search API
  (410 error) or required the Bun runtime, which crashes on CPUs without AVX
  (`Illegal instruction`). The new assistant is pure Node.js and runs on any
  CPU, using xAI's current OpenAI-compatible API with function calling.
- The assistant can read, write and edit files, list directories, and run shell
  commands in `/config`, and can reach the HA API via `HASS_URL`/`HASS_TOKEN`.
- Back to the lightweight Alpine base image; `armv7` support restored.

## 1.1.1

- Install the **Bun** runtime in the image. The `grok-dev` CLI's entrypoint uses
  a `#!/usr/bin/env bun` shebang, so it failed at runtime with
  `/usr/bin/env: 'bun': No such file or directory` when only Node was present.

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
