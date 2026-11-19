#!/usr/bin/env bash
# One-command build for PREPARE Vid 6 ("Do you know what heats your apartment?").
#   ./build.sh path/to/edits.mp4    the "Prepare_Vid 6 Edits" composition exported from Descript (1080x1920)
#   ./build.sh                      reuse assets/base.mp4
# Output: out/prepare-vid6.mp4 (1080x1920, 30 fps, the delivered voice + SFX). Captions are burned in.
set -euo pipefail
cd "$(dirname "$0")"
# Folder that holds puppeteer-core (see ../README.md); a Python with torch + numpy + Pillow for the matte and relight;
# the Robust Video Matting model (rvm_mobilenetv3_fp32.torchscript, github.com/PeterL1n/RobustVideoMatting releases).
SCRATCH=/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-$SCRATCH/hf/node_modules}"
PY="${PY:-$SCRATCH/venv/bin/python}"
RVM="${RVM:-$SCRATCH/models/rvm_mobilenetv3_fp32.torchscript}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR" assets

if [ -n "${1:-}" ]; then cp "$1" assets/base.mp4; fi
if [ ! -d assets/frames ]; then
  mkdir -p assets/frames
  ffmpeg -v error -y -i assets/base.mp4 -vf fps=30 -q:v 2 -start_number 1 assets/frames/f_%05d.jpg
fi
# shot C (seated, from the 23.2s dissolve): person matte + virtual key light
[ -f assets/lit/f_01939.jpg ] || "$PY" tools/prep_footage.py assets/frames 697 1939 "$RVM"
# feature tracks for the thermostat ring (shot A) and the closet (shot B)
[ -f data/track_thermo.json ] || "$PY" tools/track.py assets/frames 1 201 37 910 1244 data/track_thermo.json --box 200
[ -f data/track_closet.json ] || "$PY" tools/track.py assets/frames 203 698 360 450 230 data/track_closet.json --box 160
python3 tools/make-data.py
[ -f sfx/thud.wav ] || tools/make-sfx.sh
node ../tools/render.cjs --in index.html --out "$OUT_DIR/picture.mp4" --out-width 1080 --fps 30
node tools/mix.mjs "$OUT_DIR/picture.mp4" "$OUT_DIR/prepare-vid6.mp4"
ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -of compact "$OUT_DIR/prepare-vid6.mp4"
