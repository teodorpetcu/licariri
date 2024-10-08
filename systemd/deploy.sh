#!/usr/bin/bash

mkdir -p "${HOME}/.local/bin/"
cp "$(dirname $0)/licariri-backup.sh" "${HOME}/.local/bin/licariri-backup.sh"
chmod +x "${HOME}/.local/bin/licariri-backup.sh"

mkdir -p "${HOME}/.config/systemd/user/"
cp "$(dirname $0)/licariri-backup.service" "${HOME}/.config/systemd/user/"
cp "$(dirname $0)/licariri-backup.timer" "${HOME}/.config/systemd/user/"

systemctl --user daemon-reload
systemctl --user restart licariri-backup.timer
