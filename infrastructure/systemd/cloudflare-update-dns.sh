#!/usr/bin/env bash

# TODO: put in a separate file and source that
[[ -z "${XDG_CONFIG_HOME}" ]] \
    && XDG_CONFIG_HOME="${HOME}/.config"
readonly CREDENTIALS_FILE="${XDG_CONFIG_HOME}/licariri/cloudflare-update-dns-credentials.sh"
[[ -f "${CREDENTIALS_FILE}" ]] \
    && source "${CREDENTIALS_FILE}" \
    || (echo "error: no credentials file at '${CREDENTIALS_FILE}'" 1>&2 && exit 1)

readonly IP_LOG_FILE="${HOME}/.ip-log"

current_ip=$(curl --silent https://ipv4.icanhazip.com)

function new_ip_differs_from_last {
    if [[ "${current_ip}" != "$(tail -n1 ${IP_LOG_FILE})" ]]; then
        return 0 # true
    else
        return 1 # false
    fi
}

function update_ip_log {
    echo "$(date '+%Y-%m-%d') ${current_ip}" >> "${IP_LOG_FILE}"
}

function update_cloudflare_dns_record {
    curl https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$DNS_RECORD_ID \
        -X PUT \
        -H 'Content-Type: application/json' \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -d "{
          \"name\": \"licariri.ro\",
          \"ttl\": 3600,
          \"type\": \"A\",
          \"content\": \"${current_ip}\",
          \"proxied\": true
        }"
}

new_ip_differs_from_last && update_ip_log && update_cloudflare_dns_record
exit 0
