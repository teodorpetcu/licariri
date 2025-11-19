#!/usr/bin/bash

[[ -z "${APPDATA_PATH}" ]] \
    && APPDATA_PATH="${HOME}/licariri/appdata"
[[ -z "${BACKUPS_DIRECTORY}" ]] \
    && BACKUPS_DIRECTORY="${HOME}/backups/licariri"
[[ -z "${BACKUP_MAX_AGE_DAYS}" ]] \
    && BACKUP_MAX_AGE_DAYS=60

mkdir -p "${BACKUPS_DIRECTORY}"

cd "$(dirname ${APPDATA_PATH})"

tar --force-local --exclude="$(basename ${APPDATA_PATH})/magazines" -czf "${BACKUPS_DIRECTORY}/backup-$(date +%Y-%m-%d-%H-%M-%S).tar.gz" "$(basename ${APPDATA_PATH})" \
    && echo "licariri-backup.sh: successfully made a backup of appdata"

find "${BACKUPS_DIRECTORY}" -mtime +"${BACKUP_MAX_AGE_DAYS}" -delete
