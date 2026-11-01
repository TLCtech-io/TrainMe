#!/usr/bin/env bash
# TLC_TRNG Decision Support Tool commercial: the 60 s and 30 s cuts (16:9, 1920x1080, 30 fps).
#   ./build.sh          both cuts
#   ./build.sh long     one cut (long | short)
# Inputs (committed): media/narration_{long,short}_sheldon.m4a (the Descript reads), media/capture/ (the app shots),
# media/iphone-share-edit.mp4 (the cleaned Share Summary clip), data/words_*.json and data/beats_*.json.
# Output in $OUT_DIR (default out/): "TLC_TRNG DST - 60s.mp4" (61 s) and "TLC_TRNG DST - 30s.mp4" (31 s).
set -euo pipefail
cd "$(dirname "$0")"
SCRATCH=/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-$SCRATCH/hf/node_modules}"
PY="${PY:-$SCRATCH/venv/bin/python}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR" assets

# the phone clip as frames, for the renderer
if [ ! -f assets/iphone/f_0001.jpg ]; then
  mkdir -p assets/iphone
  ffmpeg -v error -i media/iphone-share-edit.mp4 -vf "fps=30,scale=700:-2" -q:v 2 assets/iphone/f_%04d.jpg
fi

build() {   # build <long|short> <seconds> <label>
  local cut=$1 len=$2 label=$3
  # the narration, its beats spaced to the cut (the voice itself untouched), and every word's time for the picture
  "$PY" tools/time_narration.py "media/narration_${cut}_sheldon.m4a" "data/words_${cut}.json" "data/beats_${cut}.json" \
    "assets/narration_${cut}_timed.wav" "data/timing_${cut}.js" "$len"
  # render in three parallel parts, then join them (each part starts on a keyframe)
  local q=""; [ "$cut" = short ] && q="--query cut=short"
  local a=0 b=$(python3 -c "print($len/3)") c=$(python3 -c "print(2*$len/3)")
  node ../tools/render.cjs --in index.html $q --out "$OUT_DIR/$cut-part-1.mp4" --fps 30 --from $a --to $b &
  node ../tools/render.cjs --in index.html $q --out "$OUT_DIR/$cut-part-2.mp4" --fps 30 --from $b --to $c &
  node ../tools/render.cjs --in index.html $q --out "$OUT_DIR/$cut-part-3.mp4" --fps 30 --from $c --to $len &
  wait
  printf "file '%s'\n" "$cut-part-1.mp4" "$cut-part-2.mp4" "$cut-part-3.mp4" > "$OUT_DIR/$cut-parts.txt"
  ffmpeg -v error -y -f concat -safe 0 -i "$OUT_DIR/$cut-parts.txt" -c copy "$OUT_DIR/$cut-picture.mp4"
  ffmpeg -v error -y -i "$OUT_DIR/$cut-picture.mp4" -i "assets/narration_${cut}_timed.wav" -map 0:v -map 1:a \
    -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT_DIR/TLC_TRNG DST - $label.mp4"
  ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact "$OUT_DIR/TLC_TRNG DST - $label.mp4"
}

case "${1:-both}" in
  long)  build long 61 60s ;;
  short) build short 31 30s ;;
  *)     build long 61 60s; build short 31 30s ;;
esac
