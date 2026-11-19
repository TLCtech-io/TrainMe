#!/usr/bin/env bash
# Scenes 19 and 20 (Erich Brenn plate spinning) as one clip per scene, 3840x2160 30 fps, each covering its scene.
# Needs src/brenn/ (frames from the user's GIF; not in git): see the comment at the top of s19-20-brenn.html.
#   NODE_PATH=<dir with puppeteer-core> ./build_s19_20.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
node ../tools/render.cjs --in s19-20-brenn.html --out "out/S19 Ed Sullivan plate spinning (GIF).mp4" --out-width 3840 --fps 30 --from 0 --to 18.25 &
node ../tools/render.cjs --in s19-20-brenn.html --out "out/S20 Erich Brenn, plates spinning count (GIF).mp4" --out-width 3840 --fps 30 --from 18.22 --to 30.98 &
wait
for f in out/S19*.mp4 out/S20*.mp4; do echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f") $f"; done
