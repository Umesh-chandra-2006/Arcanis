#!/bin/sh
# Renders every video into "D:/arcanis content vids", one at a time (the machine is short on memory),
# each with a 720p, 30 fps WhatsApp copy. Usage: sh render-all.sh [id ...]
cd "$(dirname "$0")" || exit 1
OUT="D:/arcanis content vids"
mkdir -p "$OUT"
num() { case "$1" in launch) echo 1;; moods) echo 2;; name) echo 3;; rate) echo 4;; forge) echo 5;; elements) echo 7;; esac; }
for id in ${@:-moods name rate forge elements launch}; do
  n=$(num "$id")
  if [ "$id" = launch ]; then node audio.mjs >/dev/null; audio=out/audio.wav; else node score.mjs "$id" >/dev/null; audio="out/${id}_audio.wav"; fi
  node render.mjs --v "$id" --out "$OUT/${n}_${id}.mp4" --audio "$audio" | tail -1 || exit 1
  ffmpeg -v error -y -i "$OUT/${n}_${id}.mp4" -c:v libx264 -preset slow -b:v 3.6M -maxrate 4.5M -bufsize 9M -vf "scale=720:1280,fps=30" -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k "$OUT/${n}_${id}_whatsapp.mp4" || exit 1
done
ls -l "$OUT"
