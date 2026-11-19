#!/usr/bin/env bash
# Turn a source shot (AI or stock) into a scene clip: 3840x2160, 30 fps, no audio, at least the scene's length.
#   tools/scene_clip.sh <source.mp4> <scene seconds> <out.mp4> [<source start s>] [<speed>]
# The clip is cut from <source start> (default 0) and, if the shot is shorter than the scene, slowed to fit
# (or pass <speed>, e.g. 0.9). One extra frame is added so the clip always covers its scene.
set -euo pipefail
src=$1; dur=$2; out=$3; ss=${4:-0}; speed=${5:-}
have=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
need=$(python3 -c "print(round($dur + 1/30, 3))")
if [ -z "$speed" ]; then speed=$(python3 -c "a=$have-$ss; n=$need; print(1.0 if a>=n else round(a/n, 4))"); fi
ffmpeg -v error -y -ss "$ss" -i "$src" -an \
  -vf "setpts=PTS/${speed},fps=30,scale=3840:2160:flags=lanczos,format=yuv420p" \
  -t "$need" -c:v libx264 -crf 16 -preset slow -g 30 -movflags +faststart "$out"
echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out") s (scene $dur s, speed $speed): $out"
