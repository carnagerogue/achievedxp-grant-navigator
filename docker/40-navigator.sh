#!/bin/sh
# Runs from the nginx image's /docker-entrypoint.d before nginx starts.
set -eu
WEB=/usr/share/nginx/html

# LEAD_ENDPOINT unset keeps the app's default (Formsubmit -> leads@nucleos.com);
# set to an empty string to turn lead POSTs off.
NAVIGATOR_WEB_ROOT="$WEB" node /opt/navigator/server/write-config.mjs

# Same-origin AI gateway. It makes no model calls unless all server settings
# are present and a request passes origin, configured access mode, and rate-limit checks.
GRANT_AI_STATIC=off NAVIGATOR_WEB_ROOT="$WEB" GRANT_AI_HOST=127.0.0.1 GRANT_AI_PORT=8787 node /opt/navigator/server/index.mjs &

# Refresh opportunities.json now and then every FEED_REFRESH_INTERVAL_SECONDS (default daily).
# Until the first refresh finishes, the copy baked into the image is served.
if [ "${FEED_REFRESH:-on}" != "off" ]; then
  (
    while true; do
      node "$WEB/scripts/refresh-all.mjs" || echo "navigator: feed refresh failed, keeping previous opportunities.json" >&2
      sleep "${FEED_REFRESH_INTERVAL_SECONDS:-86400}"
    done
  ) &
fi
