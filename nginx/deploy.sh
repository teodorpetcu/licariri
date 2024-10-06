#!/usr/bin/bash

cp $(dirname "$0")/licariri.config /etc/nginx/sites-available/licariri.config \
    && systemctl restart nginx.service
