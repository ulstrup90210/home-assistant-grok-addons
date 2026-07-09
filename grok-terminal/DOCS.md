# Grok Terminal

A web-based terminal for Home Assistant with [xAI's Grok CLI](https://www.npmjs.com/package/grok-dev)
pre-installed. Open it from the sidebar and chat with Grok to read entity
states, edit your `configuration.yaml`, build automations, debug logs, and more —
all with direct access to your `/config` directory.

## Installation

1. In Home Assistant go to **Settings → Add-ons → Add-on Store**.
2. Click the **⋮** menu (top right) → **Repositories**.
3. Add the URL of this repository and click **Add**.
4. Find **Grok Terminal** in the store and click **Install**.

## Configuration

Open the add-on's **Configuration** tab:

| Option          | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `xai_api_key`   | Your xAI API key. Get one at <https://console.x.ai>. **Required.**          |
| `grok_model`    | Which Grok model to use. Default: `grok-code-fast-1`.                        |
| `max_tokens`    | Maximum response tokens. Default: `8192`.                                    |

After entering your API key, click **Save** and **(re)start** the add-on.

### Getting an xAI API key

1. Go to <https://console.x.ai> and sign in with your X / xAI account.
2. Open **API Keys** and create a new key.
3. Add billing/credits (the API is pay-as-you-go, separate from a Grok chat
   subscription).
4. Copy the key (starts with `xai-...`) into the `xai_api_key` option.

## Usage

1. Start the add-on and click **Open Web UI** (or the **Grok** item in the sidebar).
2. The Grok CLI launches automatically in your `/config` folder.
3. Ask it things like:
   - `Add a template sensor that shows the average of my three temperature sensors`
   - `Why is my Zigbee automation not triggering? Check the logs.`
   - `Create a new automation that turns off all lights at midnight`
4. Type `exit` to drop to a normal shell; restart the add-on to relaunch Grok.

## Home Assistant API access

The add-on exports `HASS_URL` and `HASS_TOKEN` (via the Supervisor proxy) into
the terminal, so you can also query the live API directly, e.g.:

```bash
curl -s -H "Authorization: Bearer $HASS_TOKEN" $HASS_URL/api/states | jq '.[].entity_id'
```

## Security notes

- Your API key is stored in the add-on options and used only to call `api.x.ai`.
- Grok can read and modify everything in `/config`. Review changes before
  restarting Home Assistant, and keep backups/snapshots.
- The terminal is protected by Home Assistant's authentication (ingress). Do not
  expose it publicly without additional protection.

## Troubleshooting

- **"No xAI API key configured"** — set `xai_api_key` and restart.
- **401 / auth errors** — the key is wrong or has no credits; check
  <https://console.x.ai>.
- **`grok` exits immediately** — the terminal falls back to a normal shell; run
  `grok` manually to see the error message.
