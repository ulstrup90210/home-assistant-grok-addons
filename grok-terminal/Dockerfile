ARG BUILD_FROM
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8

# Alpine base is fine here: the Grok CLI is pure Node.js with no native
# dependencies, and Node runs on any CPU (unlike Bun, which needs AVX).
#   nodejs      -> runs the Grok CLI
#   ttyd        -> serves the web terminal that HA ingress proxies
#   git/curl/jq -> common tools the assistant and users need
RUN apk add --no-cache \
        nodejs \
        ttyd \
        bash \
        git \
        curl \
        jq \
        openssh-client \
        nano

# Grok assistant (dependency-free Node script) + entrypoint
COPY grok-cli.js /opt/grok-cli.js
COPY run.sh /run.sh
RUN chmod a+x /run.sh /opt/grok-cli.js

WORKDIR /config

CMD [ "/run.sh" ]
