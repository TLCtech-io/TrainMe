#!/usr/bin/env bash
# Uptown Sound "Pick Your Poison" reel: Poison Preview SOUND OF SILENCE.
#   ./build.sh path/to/clip.MP4     (default: assets/clip.mp4)
# The clip is used as delivered (trim, end fade, greyscale and vignette are the user's).
# Output: out/uptown-silence-reel.mp4 (1080x1920, 30 fps, the clip's own audio stream copied untouched)
set -euo pipefail
cd "$(dirname "$0")"
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad/hf/node_modules}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR" assets
if [ -n "${1:-}" ]; then cp "$1" assets/clip.mp4; fi
rm -rf assets/frames && mkdir -p assets/frames
ffmpeg -v error -y -i assets/clip.mp4 -vf "scale=1080:1920" -q:v 2 -start_number 1 assets/frames/f_%05d.jpg
node ../tools/render.cjs --in index.html --out "$OUT_DIR/picture.mp4" --out-width 1080 --fps 30
ffmpeg -v error -y -i "$OUT_DIR/picture.mp4" -i assets/clip.mp4 -map 0:v -map 1:a:0 -c:v copy -c:a copy -shortest -movflags +faststart "$OUT_DIR/uptown-silence-reel.mp4"
ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,width,height,r_frame_rate -of compact "$OUT_DIR/uptown-silence-reel.mp4"
