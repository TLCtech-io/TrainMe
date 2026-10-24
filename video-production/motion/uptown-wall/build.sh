#!/usr/bin/env bash
# Pick Your Poison video wall: the stills and the seamless loop.
#   ./build.sh            stills (16:9 and 16:10) and the 20 s loop in four sizes
# Needs assets/plate.png (see prompt.txt for where it comes from and how it was fixed).
# Output in $OUT_DIR (default out/):
#   wall-16x9.png  wall-16x10.png                         3840x2160 / 3840x2400 stills
#   loop-16x10-3840x2400.mp4  loop-16x10-1920x1200.mp4    the loop (H.264, 30 fps, 20 s, silent)
#   loop-16x9-3840x2160.mp4   loop-16x9-1920x1080.mp4     the same, centre rows of the 16:10 frame
set -euo pipefail
cd "$(dirname "$0")"
SCRATCH=/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-$SCRATCH/hf/node_modules}"
PY="${PY:-$SCRATCH/venv/bin/python}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR" data
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

"$PY" -I tools/find_medallions.py assets/plate.png data/medallions.js
"$PY" -I tools/snap_flames.py assets/plate.png data/flames.js > /dev/null
for r in 169 1610; do node ../tools/render.cjs --in index.html --query r=$r --stills 0 --stills-dir "$TMP/$r" > /dev/null; done
cp "$TMP/169/index_t0.00.png" "$OUT_DIR/wall-16x9.png"
cp "$TMP/1610/index_t0.00.png" "$OUT_DIR/wall-16x10.png"
cp "$OUT_DIR/wall-16x10.png" assets/base_1610.png

# the loop, rendered once at 16:10; the 16:9 version is its centre 2160 rows (the 16:10 frame only adds dark ceiling
# and bar front above and below)
tools/render_loop.sh "$OUT_DIR/loop-16x10-3840x2400.mp4"
X264=(-c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -g 30 -movflags +faststart -an)
ffmpeg -v error -y -i "$OUT_DIR/loop-16x10-3840x2400.mp4" -vf "crop=3840:2160:0:120" "${X264[@]}" "$OUT_DIR/loop-16x9-3840x2160.mp4"
ffmpeg -v error -y -i "$OUT_DIR/loop-16x10-3840x2400.mp4" -vf "scale=1920:1200:flags=lanczos" "${X264[@]}" "$OUT_DIR/loop-16x10-1920x1200.mp4"
ffmpeg -v error -y -i "$OUT_DIR/loop-16x10-3840x2400.mp4" -vf "crop=3840:2160:0:120,scale=1920:1080:flags=lanczos" "${X264[@]}" "$OUT_DIR/loop-16x9-1920x1080.mp4"
for f in "$OUT_DIR"/loop-*.mp4; do ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of csv=p=0 "$f" | tr '\n' ' '; echo " $f"; done
