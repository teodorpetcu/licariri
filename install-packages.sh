#!/usr/bin/bash

# install all needed packages on a Raspberry Pi with Raspbian
# WITHOUT configuring them!!!

[[ ${UID} != 0 ]] \
    && echo "error: need to be root to run this script" 1>&2 \
    && exit 1

# TODO: confirm this before running
echo "deb http://deb.debian.org/debian testing main contrib non-free non-free-firmware" > /etc/apt/sources.list
apt dist-upgrade

# for running the server itself
apt install nodejs npm
npm install -g pm2
chmod 755 /usr/local/lib/node_modules/ --recursive # because by default it's only root-accessible

# the configuration is left up to other scripts
apt install nginx ufw fail2ban

# for server scripts manipulating PDF magazines
apt install qpdf imagemagick mupdf-tools opam
opam install cpdf
