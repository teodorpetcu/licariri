#!/usr/bin/bash

cp $(dirname "$0")/licariri.config /etc/fail2ban/jail.d/ \
    && systemctl restart fail2ban.service \
    && echo "successfully deployed fail2ban config"
