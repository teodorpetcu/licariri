#!/usr/bin/bash

[[ -z "${XDG_CONFIG_HOME}" ]] \
    && XDG_CONFIG_HOME="${HOME}/.config"
readonly CREDENTIALS_FILE="${XDG_CONFIG_HOME}/licariri/cloudflare-cache-purge-css.sh"
[[ -f "${CREDENTIALS_FILE}" ]] \
    && source "${CREDENTIALS_FILE}" \
    || (echo "error: no credentials file at '${CREDENTIALS_FILE}'" 1>&2 && exit 1)

curl https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -d '{ "prefixes": [ "licariri.ro/css" ] }'
