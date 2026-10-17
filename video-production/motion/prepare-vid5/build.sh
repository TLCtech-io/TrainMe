#!/usr/bin/env bash
# One-command build for PREPARE Vid 5 (Claude Edit Playbook version).
#   ./build.sh                      -> uses assets/base.mp4 (real footage), or makes a placeholder if it is missing
#   ./build.sh path/to/base.mp4     -> real footage exported from Descript ("Prepare_Vid 5 Claude Base" or "Prepare_Vid 5 Edits")
# Output: out/prepare-vid5-claude-edit.mp4 (1080x1920, 30fps, voice + SFX)
set -euo pipefail
cd "$(dirname "$0")"
# Folder that holds puppeteer-core (see ../README.md); prepended so a global NODE_PATH does not shadow it.
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad/hf/node_modules}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR"

if [ -n "${1:-}" ]; then mkdir -p assets && cp "$1" assets/base.mp4; fi
[ -f assets/base.mp4 ] || tools/make-placeholder.sh
node tools/timing.mjs
tools/prep-footage.sh assets/base.mp4
[ -f sfx/ding.wav ] || tools/make-sfx.sh
node ../tools/render.cjs --in index.html --out "$OUT_DIR/picture.mp4" --out-width 1080
node tools/mix.mjs "$OUT_DIR/picture.mp4" "$OUT_DIR/prepare-vid5-claude-edit.mp4"
ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -of compact "$OUT_DIR/prepare-vid5-claude-edit.mp4"
