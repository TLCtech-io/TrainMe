#!/usr/bin/env bash
# Pilot 3 v2 as one clip per scene (WORKING scenes 38 to 41), 3840x2160 30 fps, each exactly its scene's length.
# Scene times are from data/scenes_working_2026-11-19.json; master time 0 = WORKING 404.20 s.
#   NODE_PATH=<dir with puppeteer-core> ./build_pilot3.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
render() {   # render <scene> <from> <to> <name>
  node ../tools/render.cjs --in pilot3-v2.html --out "out/$4.mp4" --out-width 3840 --fps 30 --from "$2" --to "$3" &
}
render 38 0.00  14.25 "S38 NIMS optimal 1 to 5 (pilot 3 v2)"
render 39 14.23 21.38 "S39 It depends on the factors (pilot 3 v2)"
render 40 21.36 33.01 "S40 Search and rescue, level ground (pilot 3 v2)"
render 41 32.99 41.64 "S41 Search and rescue, challenging terrain (pilot 3 v2)"
wait
for f in out/S3*.mp4 out/S4[01]*.mp4; do ffprobe -v error -show_entries format=duration:stream=width,height -of csv=p=0 "$f" | tr '\n' ' '; echo " $f"; done
