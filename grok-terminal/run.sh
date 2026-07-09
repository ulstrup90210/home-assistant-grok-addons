#!/usr/bin/with-contenv bashio
# ==============================================================================
# Grok Terminal - launches a web terminal (ttyd) running the Grok CLI.
# ==============================================================================
set -e

# --- Read add-on options ------------------------------------------------------
MODEL="$(bashio::config 'grok_model')"
MAX_TOKENS="$(bashio::config 'max_tokens')"

export GROK_BASE_URL="https://api.x.ai/v1"
export GROK_MODEL="${MODEL:-grok-code-fast-1}"
export GROK_MAX_TOKENS="${MAX_TOKENS:-8192}"
export GROK_MAX_STEPS="$(bashio::config 'max_tool_steps')"

# Confirm before shell commands / file writes (secure default: on unless
# the user has explicitly set require_approval to false)
if bashio::config.false 'require_approval'; then
    export GROK_REQUIRE_APPROVAL="false"
else
    export GROK_REQUIRE_APPROVAL="true"
fi

# Give the CLI access to Home Assistant's API through the Supervisor proxy,
# so you can ask Grok to read entity states or call services.
export HASS_URL="http://supervisor/core"
export HASS_TOKEN="${SUPERVISOR_TOKEN}"

# --- Decide what to launch inside the terminal --------------------------------
if bashio::config.is_empty 'xai_api_key'; then
    bashio::log.warning "No xAI API key set yet."
    bashio::log.warning "Add one under the 'Configuration' tab (get it at https://console.x.ai), then restart."
    START_CMD='printf "\n\033[33m⚠  No xAI API key configured.\033[0m\nAdd it in the add-on Configuration tab (https://console.x.ai) and restart.\n\n"; exec bash'
else
    export GROK_API_KEY="$(bashio::config 'xai_api_key')"
    bashio::log.info "Starting Grok assistant (model: ${GROK_MODEL})..."
    # Fall back to a shell if the assistant exits, so the terminal stays usable.
    START_CMD='node /opt/grok-cli.js; exec bash'
fi

# --- Serve the web terminal ---------------------------------------------------
cd /config
exec ttyd \
    --port 7681 \
    --interface 0.0.0.0 \
    --writable \
    --cwd /config \
    bash -lc "${START_CMD}"
