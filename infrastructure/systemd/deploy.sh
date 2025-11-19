#!/usr/bin/bash

# copy scripts to their appropriate location
mkdir -p "${HOME}/.local/bin/"
find $(dirname $0) -maxdepth 1 -type f ! -name deploy.sh -exec cp -t "${HOME}/.local/bin/" {} +
chmod +x ${HOME}/.local/bin/*.sh

# put systemd files where they belong
mkdir -p "${HOME}/.config/systemd/user/"
cp $(dirname $0)/*.service "${HOME}/.config/systemd/user/"
cp $(dirname $0)/*.path "${HOME}/.config/systemd/user/"
cp $(dirname $0)/*.timer "${HOME}/.config/systemd/user/"

# reload timers
systemctl --user daemon-reload
cd "$(dirname $0)"
for timer in *.timer *.path; do
    systemctl --user enable --now $timer
    systemctl --user restart $timer
done
