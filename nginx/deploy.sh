#!/usr/bin/bash

[[ -L /etc/nginx/sites-enabled/default.config ]] \
    && rm /etc/nginx/sites-enabled/default.config

[[ ! -L /etc/nginx/sites-enabled/licariri.config ]] \
    && ln -s /etc/nginx/sites-available/licariri.config /etc/nginx/sites-enabled/licariri.config

cp $(dirname "$0")/licariri.config /etc/nginx/sites-available/licariri.config \
    && systemctl restart nginx.service \
    && echo "successfully deployed nginx config"
