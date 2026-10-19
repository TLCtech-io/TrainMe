#!/usr/bin/env bash
# Uptown Sound "Pick Your Poison" reel: Poison Preview E.T.
#   ./build.sh path/to/clip.MOV     (default: assets/clip.mov)
# Output: out/uptown-et-reel.mp4 (1080x1920, 24000/1001 fps, original audio)
set -euo pipefail
cd "$(dirname "$0")"
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad/hf/node_modules}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR" assets
if [ -n "${1:-}" ]; then cp "$1" assets/clip.mov; fi
rm -rf assets/frames && mkdir -p assets/frames
# Only the band the UFO window shows: the phone frame scaled to 1080x1920, rows 675-1275 (the ensemble)
ffmpeg -v error -y -i assets/clip.mov -vf "fps=24000/1001,scale=1080:1920,crop=1080:600:0:675" -q:v 2 -start_number 1 assets/frames/f_%05d.jpg
node ../tools/render.cjs --in index.html --out "$OUT_DIR/picture.mp4" --out-width 1080 --fps 24000/1001
# The clip cuts mid-note; a 0.15s fade avoids a click at the loop point
ffmpeg -v error -y -i "$OUT_DIR/picture.mp4" -i assets/clip.mov -map 0:v -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -af "afade=t=out:st=17.62:d=0.15" -shortest -movflags +faststart "$OUT_DIR/uptown-et-reel.mp4"
ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,width,height,r_frame_rate -of compact "$OUT_DIR/uptown-et-reel.mp4"
