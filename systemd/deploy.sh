#!/usr/bin/bash

# copy scripts to their appropriate location
mkdir -p "${HOME}/.local/bin/"
cp $(dirname $0)/*.sh "${HOME}/.local/bin/"
chmod +x "${HOME}/.local/bin/*.sh"

# put systemd files where they belong
mkdir -p "${HOME}/.config/systemd/user/"
cp $(dirname $0)/*.service "${HOME}/.config/systemd/user/"
cp $(dirname $0)/*.timer "${HOME}/.config/systemd/user/"

# reload timers
systemctl --user daemon-reload
cd "$(dirname $0)"
for timer in *.timer; do
    systemctl --user restart $timer
done
