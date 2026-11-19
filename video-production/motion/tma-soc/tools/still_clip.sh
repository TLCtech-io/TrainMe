#!/usr/bin/env bash
# A still image as a short 4K clip with a slow push-in: tools/still_clip.sh <image> <seconds> <out.mp4>
set -euo pipefail
img=$1; dur=$2; out=$3
frames=$(python3 -c "import math; print(math.ceil(($dur + 1/30) * 30))")
ffmpeg -v error -y -loop 1 -i "$img" -vf "scale=7680:-2:flags=lanczos,zoompan=z='1+0.06*on/$frames':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$frames:s=3840x2160:fps=30,format=yuv420p" \
  -frames:v "$frames" -c:v libx264 -crf 16 -preset slow -g 30 -movflags +faststart "$out"
echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out") s: $out"
