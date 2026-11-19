#!/usr/bin/env bash
# Take the edge off a phone recording of singing (a music-safe stand-in for Descript's Studio Sound):
#   1. EQ: rumble cut at 60 Hz, +2.5 dB warmth below 180 Hz, -3 dB boxiness at 800 Hz, -1.5 dB presence at 2.8 kHz
#   2. deharsh.py: turns 2-5.5 kHz down only while it spikes (hard consonants, a mic through a room speaker)
#   3. gentle compression, then two-pass loudness normalisation to -14 LUFS / -1.5 dBTP (Reels/TikTok level)
#   ./soften_audio.sh in.(mov|mp4|wav) out.wav
# Needs ffmpeg and a python with numpy (PYTHON=..., default python3).
set -euo pipefail
IN="$1"; OUT="$2"; PY="${PYTHON:-python3}"; HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
ffmpeg -v error -y -i "$IN" -map 0:a:0 -ar 48000 \
  -af "highpass=f=60,lowshelf=f=180:g=2.5,equalizer=f=800:t=q:w=0.9:g=-3,equalizer=f=2800:t=q:w=1.2:g=-1.5" -c:a pcm_s16le "$TMP/eq.wav"
"$PY" -I "$HERE/deharsh.py" "$TMP/eq.wav" "$TMP/dh.wav" --ratio 3 --max-db 8 --over-db 3
COMP="acompressor=threshold=-21dB:ratio=2.5:attack=12:release=180:knee=6:makeup=2"
MEAS=$(ffmpeg -v info -y -i "$TMP/dh.wav" -af "$COMP,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p' \
  | "$PY" -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -v error -y -i "$TMP/dh.wav" -af "$COMP,loudnorm=I=-14:TP=-1.5:LRA=11:$MEAS:linear=true,aresample=48000" -c:a pcm_s16le "$OUT"
