#!/usr/bin/env bash
# Uptown Sound "Pick Your Poison" ticket push on "10.23 Fri Teeth" (dress rehearsal, house lights up).
#   ./build.sh path/to/clip.MOV     (default: assets/clip.mov)
# The clip is used as delivered. Output: out/uptown-teeth.mp4 (1080x1920, 24000/1001 fps, the clip's own stereo audio
# stream copied untouched; the phone's extra spatial-audio track is left out).
set -euo pipefail
cd "$(dirname "$0")"
SCRATCH=/tmp/claude-0/-home-user-TrainMe/c833cb12-34f4-587e-bb3c-3be71c4f3073/scratchpad
MOTION_NODE_MODULES="${MOTION_NODE_MODULES:-$SCRATCH/hf/node_modules}"
PY="${PY:-$SCRATCH/venv/bin/python}"
export NODE_PATH="$MOTION_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
OUT_DIR="${OUT_DIR:-out}"; mkdir -p "$OUT_DIR" assets data
if [ -n "${1:-}" ]; then cp "$1" assets/clip.mov; fi
rm -rf assets/frames && mkdir -p assets/frames
ffmpeg -v error -y -i assets/clip.mov -vf "scale=1080:1920" -q:v 2 -start_number 1 assets/frames/f_%05d.jpg
ffmpeg -v error -y -i assets/clip.mov -map 0:a:0 -ac 1 -ar 16000 -c:a pcm_s16le assets/voice16k.wav
"$PY" ../tools/audio_features.py assets/voice16k.wav data/features.js 23.976023976023978 >/dev/null
python3 -c "p='data/features.js'; s=open(p).read().strip(); s=s if s.startswith('window.') else 'window.FEATURES = ' + s + ';'; open(p,'w').write(s + '\n')"
node ../tools/render.cjs --in index.html --out "$OUT_DIR/picture.mp4" --out-width 1080 --fps 24000/1001
ffmpeg -v error -y -i "$OUT_DIR/picture.mp4" -i assets/clip.mov -map 0:v -map 1:a:0 -c:v copy -c:a copy -shortest -movflags +faststart "$OUT_DIR/uptown-teeth.mp4"
ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -of compact "$OUT_DIR/uptown-teeth.mp4"
