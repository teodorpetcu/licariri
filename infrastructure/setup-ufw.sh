#!/usr/bin/bash

[[ ${UID} != 0 ]] \
    && echo "error: must run script as root" 1>&2 \
    && exit 1

ufw allow from 192.168.100.1/24
ufw allow to 192.168.100.1/24

ufw allow ssh
ufw allow "Nginx Full"
