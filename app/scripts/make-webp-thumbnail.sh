#!/usr/bin/bash

### make-webp-thumbnail.sh
## $1 = path to pdf file to extract thumbnail from
## $2 = "--same-directory" -- output thumbnail file has the same name, but webp extension

readonly WEBP_QUALITY=75

if [[ "$2" == "--same-directory" ]]; then
    output_file="${1%.*}.webp"
else
    output_file="/tmp/thumbnail.webp"
fi


qpdf "${1}" --pages . 1 -- cover.pdf \
    && magick cover.pdf -quality "${WEBP_QUALITY}" -scale 530x750 "${output_file}" \
    && rm cover.pdf \
    && echo "${output_file}"
