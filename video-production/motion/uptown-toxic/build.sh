#!/usr/bin/env bash
# Uptown Sound "Pick Your Poison" reel, Poison No. 1: TOXIC.
#   ./build.sh path/to/clip.mp4     (default: assets/clip.mp4)
# Output: out/uptown-toxic-reel.mp4 (1080x1920, 24000/1001 fps, original audio)
set -euo pipefail
cd "$(dirname "$0")"
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad/hf/node_modules}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR" assets
if [ -n "${1:-}" ]; then cp "$1" assets/clip.mp4; fi
rm -rf assets/frames && mkdir -p assets/frames
ffmpeg -v error -y -i assets/clip.mp4 -vf "fps=24000/1001,scale=1080:1920" -q:v 2 -start_number 1 assets/frames/f_%05d.jpg
node ../tools/render.cjs --in index.html --out "$OUT_DIR/picture.mp4" --out-width 1080 --fps 24000/1001
ffmpeg -v error -y -i "$OUT_DIR/picture.mp4" -i assets/clip.mp4 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT_DIR/uptown-toxic-reel.mp4"
ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,width,height,r_frame_rate -of compact "$OUT_DIR/uptown-toxic-reel.mp4"
