# Static site served by unprivileged nginx (port 8080, uid 101). Node is only here for the
# in-container feed refresh started by docker/40-navigator.sh.
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
RUN apk add --no-cache nodejs

COPY --chown=101:101 index.html legacy.html privacy.html navigator.css navigator.js navigator-state.js styles.css workspace.css app.js grant-core.js matching.js opportunity-tools.js opportunity-workspace.js ai-workspace.js workspace.js config.js opportunities.json /usr/share/nginx/html/
COPY --chown=101:101 grant-core.js opportunity-tools.js navigator-state.js /opt/navigator/
COPY --chown=101:101 server /opt/navigator/server
COPY --chown=101:101 assets /usr/share/nginx/html/assets
COPY --chown=101:101 scripts /usr/share/nginx/html/scripts
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-navigator.sh /docker-entrypoint.d/40-navigator.sh

USER 101
EXPOSE 8080
