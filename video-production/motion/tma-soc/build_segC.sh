#!/usr/bin/env bash
# Segment C (scenes 25 to 37): full clips for 25 and 32 (4K H.264), transparent overlays for the rest (1080p ProRes 4444).
#   NODE_PATH=<dir with puppeteer-core> ./build_segC.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
declare -A NAME=([26]="leader's experience" [27]="four five six burners" [28]="team's experience" [29]="friction" [30]="distractions"
                 [31]="communications, switchboard" [34]="distance, map" [35]="safety" [36]="responders, public, environment" [37]="complexity")
node ../tools/render.cjs --in segC.html --query scene=25 --out "out/S25 Nine factors (graphic).mp4" --out-width 3840 --fps 30 &
node ../tools/render.cjs --in segC.html --query scene=32 --out "out/S32 Task variety (graphic).mp4" --out-width 3840 --fps 30 &
wait
for n in 26 27 28 29 30; do node ../tools/render.cjs --in segC.html --query scene=$n --alpha --fps 30 --out "out/S$n overlay - ${NAME[$n]}.mov" & done; wait
for n in 31 34 35 36 37; do node ../tools/render.cjs --in segC.html --query scene=$n --alpha --fps 30 --out "out/S$n overlay - ${NAME[$n]}.mov" & done; wait
for f in out/S25*.mp4 out/S32*.mp4 out/S2[6-9]*overlay*.mov out/S3[014-7]*overlay*.mov; do echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f") $(du -h "$f" | cut -f1) $f"; done
