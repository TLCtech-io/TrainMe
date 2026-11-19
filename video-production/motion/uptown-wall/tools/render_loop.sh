#!/usr/bin/env bash
# Render loop.html in N parallel segments (headless Chrome draws the WebGL on one CPU core per page) and join them.
#   tools/render_loop.sh <out.mp4> [query, e.g. w=1920] [segments, default 4]
# The result is lossless (x264 qp 0, 4:4:4): an intermediate for the final encodes in build.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(realpath -m "$1")"; Q="${2:-}"; N="${3:-4}"; LOOP=20; FPS=30
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
FRAMES=$((LOOP * FPS)); PER=$(( (FRAMES + N - 1) / N ))
pids=()
for i in $(seq 0 $((N - 1))); do
  a=$((i * PER)); b=$(( (i + 1) * PER < FRAMES ? (i + 1) * PER : FRAMES ))
  from=$(python3 -c "print($a / $FPS)"); to=$(python3 -c "print($b / $FPS)")
  node ../tools/render.cjs --in loop.html ${Q:+--query "$Q"} --out "$TMP/seg$i.mp4" --fps $FPS --crf 0 --from "$from" --to "$to" 2> "$TMP/seg$i.log" &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
for i in $(seq 0 $((N - 1))); do echo "file '$TMP/seg$i.mp4'"; done > "$TMP/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/list.txt" -c copy -movflags +faststart "$OUT"
ffprobe -v error -count_frames -show_entries stream=nb_read_frames,width,height -show_entries format=duration -of csv=p=0 "$OUT"
