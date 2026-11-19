#!/usr/bin/env bash
# Tightens the base cut per data/cuts.json and explodes it into frames + voice audio for the composition.
# Usage: tools/prep-footage.sh [assets/base.mp4]
#   base.mp4 = a download/export of the Descript composition "Prepare_Vid 5 Claude Base" (= Prepare_Vid 5 Edits), 1080x1920.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${1:-assets/base.mp4}"
[ -f "$SRC" ] || { echo "missing $SRC"; exit 1; }
rm -rf assets/frames && mkdir -p assets/frames

FILTER=$(node -e '
const cuts = require("./data/cuts.json").keep;
const snap = (x) => Math.round(x * 30) / 30; // frame grid keeps picture and sound in sync across joins
const parts = cuts.map(([a, b], i) => {
  a = snap(a); b = snap(b); const d = (b - a).toFixed(4);
  return `[0:v]trim=start=${a.toFixed(4)}:end=${b.toFixed(4)},setpts=PTS-STARTPTS,fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v${i}];` +
         `[0:a]atrim=start=${a.toFixed(4)}:end=${b.toFixed(4)},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.012,afade=t=out:st=${(d - 0.012).toFixed(4)}:d=0.012[a${i}];`;
});
const ins = cuts.map((_, i) => `[v${i}][a${i}]`).join("");
process.stdout.write(parts.join("") + `${ins}concat=n=${cuts.length}:v=1:a=1[v][a]`);
')

ffmpeg -v error -y -i "$SRC" -filter_complex "$FILTER" \
  -map "[v]" -q:v 2 -start_number 1 assets/frames/f_%05d.jpg \
  -map "[a]" -ac 2 -ar 48000 assets/voice.wav
echo "frames: $(ls assets/frames | wc -l), voice: $(ffprobe -v error -show_entries format=duration -of csv=p=0 assets/voice.wav)s"
