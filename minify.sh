#!/usr/bin/bash

### minify.sh
## $1 = path to pdf file to be minified
## $2 = "--spread-to-single" -- assume the pdf has spread pages; turn them to single pages

qpdf "${1}" --pages . 1 -- cover.pdf
qpdf "${1}" --pages . 2-r2 -- content.pdf
qpdf "${1}" --pages . r1 -- backcover.pdf

if [[ "${2}" == "--spread-to-single" ]]; then
    mutool poster -x 2 content.pdf content.pdf
fi

magick -colorspace sRGB cover.pdf cover.png
magick -colorspace sRGB backcover.pdf backcover.png

magick -colorspace sRGB cover.png cover.pdf
magick -colorspace sRGB backcover.png backcover.pdf

output_path="/tmp/minified.pdf"

qpdf --empty --pages cover.pdf content.pdf backcover.pdf -- "${output_path}" \
    && rm -f cover.pdf content.pdf backcover.pdf cover.png backcover.png \
    && echo "${output_path}"
