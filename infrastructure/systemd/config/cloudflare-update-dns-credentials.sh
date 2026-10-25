#!/usr/bin/env bash

# NOTE: API token should be zone-specific and have `DNS: Read` and `DNS: Edit`
# permissions

ZONE_ID=""
DNS_RECORD_ID=""
CLOUDFLARE_API_TOKEN=""

# to get DNS_RECORD_ID:
#curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    #-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
