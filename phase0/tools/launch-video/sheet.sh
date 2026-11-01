#!/bin/sh
# Contact sheet of preview stills: sh sheet.sh <id> <cols>  ->  out/<id>_sheet.png
cd "$(dirname "$0")/out" || exit 1
i=0
for f in $(ls "$1"_[0-9]*.png | sort -t_ -k2 -g); do cp "$f" "seq_$(printf %02d $i).png"; i=$((i+1)); done
ffmpeg -v error -y -i seq_%02d.png -vf "scale=300:-1,tile=${2:-8}x1" "$1_sheet.png" && rm -f seq_*.png
