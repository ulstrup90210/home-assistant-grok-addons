# Grok Add-ons for Home Assistant

A custom [Home Assistant](https://www.home-assistant.io/) add-on repository that
brings **xAI's Grok** into your smart home as an AI assistant — inspired by
[heytcass/home-assistant-addons](https://github.com/heytcass/home-assistant-addons)
(which does the same with Claude), but powered by Grok.

## Add-ons in this repository

### 🤖 [Grok Terminal](./grok-terminal)

A web-based terminal with the [Grok CLI](https://www.npmjs.com/package/grok-dev)
pre-installed. Open it from the Home Assistant sidebar and let Grok read your
entity states, edit `configuration.yaml`, build automations, and debug your
setup — with direct access to your `/config` directory.

## Installation

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/)

1. Navigate to **Settings → Add-ons → Add-on Store**.
2. Click the **⋮** menu (top right) → **Repositories**.
3. Paste this repository's URL and click **Add**.
4. Install **Grok Terminal** from the store.
5. Enter your xAI API key (from <https://console.x.ai>) in the add-on's
   **Configuration** tab, then start it.

> **Requirements:** Home Assistant OS or Supervised (add-ons are not supported on
> Home Assistant Container or Core). An xAI API key with credits is required.

## Repository layout

```
.
├── repository.yaml          # Add-on repository metadata
├── README.md
└── grok-terminal/           # The add-on
    ├── config.yaml          # Add-on manifest (options, ingress, mappings)
    ├── build.yaml           # Base images per architecture
    ├── Dockerfile           # Installs Node.js, ttyd and the Grok CLI
    ├── run.sh               # Entrypoint: launches ttyd + grok
    ├── DOCS.md              # In-app documentation
    └── CHANGELOG.md
```

## Publishing

Push this folder to the public GitHub repository
<https://github.com/ulstrup90210/home-assistant-grok-addons>. That repository URL
is what you add in step 3 above.

Optionally add an `icon.png` (256×256) and `logo.png` inside `grok-terminal/`
to give the add-on a nicer look in the store.

## License

MIT
