#!/usr/bin/bash

[[ -z "${APPDATA_PATH}" ]] \
    && APPDATA_PATH="${HOME}/licariri/appdata"
[[ -z "${BACKUPS_DIRECTORY}" ]] \
    && BACKUPS_DIRECTORY="${HOME}/backup"

mkdir -p "${BACKUPS_DIRECTORY}"

cd "$(dirname ${APPDATA_PATH})"

tar --force-local --exclude="$(basename ${APPDATA_PATH})/pdfprints" -czf "${BACKUPS_DIRECTORY}/backup-$(date +%Y-%m-%d-%M-%S).tar.gz" "$(basename ${APPDATA_PATH})" \
    && echo "licariri-backup.sh: successfully made a backup of appdata"
