ARG BUILD_FROM
FROM ${BUILD_FROM}

# HA passes the target architecture here (amd64 / aarch64)
ARG BUILD_ARCH

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive

# System dependencies + Node.js 20 (via NodeSource).
# Debian/glibc base is used because the Grok CLI (grok-dev) depends on
# @opentui native binaries, whose prebuilt libs target glibc, not Alpine/musl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        git \
        jq \
        nano \
        openssh-client \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ttyd static binary (web terminal that HA ingress proxies)
RUN set -eux; \
    case "${BUILD_ARCH}" in \
      amd64)   TTYD_ARCH="x86_64" ;; \
      aarch64) TTYD_ARCH="aarch64" ;; \
      *) echo "Unsupported architecture: ${BUILD_ARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /usr/bin/ttyd \
      "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${TTYD_ARCH}"; \
    chmod +x /usr/bin/ttyd; \
    ttyd --version

# Bun runtime: the grok-dev CLI's shebang is `#!/usr/bin/env bun`, so Bun
# must be present at runtime (Node alone is not enough).
RUN npm install -g bun \
    && bun --version

# xAI Grok CLI. NOTE: use the maintained "grok-dev" package (provides `grok`).
# The older "@vibe-kit/grok-cli" still calls xAI's deprecated Live Search API
# and now fails with "410 Live search is deprecated".
RUN npm install -g grok-dev \
    && npm cache clean --force \
    && grok --version || true

# Add-on entrypoint
COPY run.sh /run.sh
RUN chmod a+x /run.sh

WORKDIR /config

CMD [ "/run.sh" ]
