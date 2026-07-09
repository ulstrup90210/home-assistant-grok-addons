ARG BUILD_FROM
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    NODE_ENV=production

# System dependencies:
#   nodejs/npm  -> runs the Grok CLI
#   ttyd        -> serves the web terminal that HA ingress proxies
#   git/curl/jq -> common tools the CLI and users need
RUN apk add --no-cache \
        nodejs \
        npm \
        ttyd \
        bash \
        git \
        curl \
        jq \
        openssh-client \
        nano

# Install xAI's Grok CLI globally (provides the `grok` command)
RUN npm install -g @vibe-kit/grok-cli \
    && npm cache clean --force

# Add-on entrypoint
COPY run.sh /run.sh
RUN chmod a+x /run.sh

WORKDIR /config

CMD [ "/run.sh" ]
