#!/usr/bin/env bash
# Segment B illustrated plate spinner: one clip per scene (21, 22, 24), 3840x2160 30 fps, each covering its scene.
#   NODE_PATH=<dir with puppeteer-core> ./build_segB.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
node ../tools/render.cjs --in segB-plates.html --query scene=21 --out "out/S21 More distance (plate spinner).mp4" --out-width 3840 --fps 30 &
node ../tools/render.cjs --in segB-plates.html --query scene=22 --out "out/S22 Different sizes and weights (plate spinner).mp4" --out-width 3840 --fps 30 &
node ../tools/render.cjs --in segB-plates.html --query scene=24 --out "out/S24 Fine china, fragile and costly (plate spinner).mp4" --out-width 3840 --fps 30 &
wait
for f in out/S21*.mp4 out/S22*.mp4 out/S24*.mp4; do echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f") $f"; done
