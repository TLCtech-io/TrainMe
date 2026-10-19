#!/usr/bin/env bash
# Take the edge off a phone recording of singing (a music-safe stand-in for Descript's Studio Sound).
#   ./soften_audio.sh in.(mov|mp4|wav) out.wav
# Steps (env vars switch the stronger ones on):
#   DEREVERB=1  AI room/echo removal: UVR-DeEcho-DeReverb via audio-separator (aggression 30, test-time augmentation)
#   CURVE=file  firequalizer curve from fit_eq.py (one filter string); otherwise a fixed gentle EQ
#               (rumble cut, +2.5 dB warmth, -3 dB at 800 Hz, -1.5 dB at 2.8 kHz)
#   deharsh.py  dynamic cut while a band spikes; BAND=lo,hi (default 2200,5000), OVER/RATIO/MAXDB tune it
#   compression, then two-pass loudness normalisation to -14 LUFS / -1.5 dBTP (Reels/TikTok level)
# Needs ffmpeg and a python with numpy (PYTHON=...); DEREVERB also needs audio-separator in that python's env.
set -euo pipefail
IN="$1"; OUT="$2"; PY="${PYTHON:-python3}"; HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
ffmpeg -v error -y -i "$IN" -map 0:a:0 -ar 48000 -c:a pcm_s16le "$TMP/in.wav"
SRC="$TMP/in.wav"
if [ "${DEREVERB:-0}" = 1 ]; then
  "$(dirname "$PY")/audio-separator" "$SRC" -m UVR-DeEcho-DeReverb.pth --vr_aggression 30 --vr_enable_tta \
    --model_file_dir "${MODEL_DIR:-/tmp/audio-separator-models}" --output_dir "$TMP/sep" --output_format WAV >/dev/null 2>&1
  ffmpeg -v error -y -i "$TMP/sep/in_(No Reverb)_UVR-DeEcho-DeReverb.wav" -ar 48000 -ac 2 -c:a pcm_s16le "$TMP/dry.wav"
  SRC="$TMP/dry.wav"
fi
if [ -n "${CURVE:-}" ]; then
  # firequalizer (delay=0.05) shifts the audio by 2400 samples at 48 kHz; trim them to stay in sync with the picture
  EQ="highpass=f=60:poles=2,$(cat "$CURVE"),atrim=start_sample=2400,asetpts=N/SR/TB"
else
  EQ="highpass=f=60,lowshelf=f=180:g=2.5,equalizer=f=800:t=q:w=0.9:g=-3,equalizer=f=2800:t=q:w=1.2:g=-1.5"
fi
ffmpeg -v error -y -i "$SRC" -af "$EQ" -c:a pcm_s16le "$TMP/eq.wav"
"$PY" -I "$HERE/deharsh.py" "$TMP/eq.wav" "$TMP/dh.wav" --band "${BAND:-2200,5000}" --over-db "${OVER:-3}" --ratio "${RATIO:-3}" --max-db "${MAXDB:-8}"
COMP="${COMP:-acompressor=threshold=-21dB:ratio=2.5:attack=12:release=180:knee=6:makeup=2}"
MEAS=$(ffmpeg -v info -y -i "$TMP/dh.wav" -af "$COMP,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p' \
  | "$PY" -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -v error -y -i "$TMP/dh.wav" -af "$COMP,loudnorm=I=-14:TP=-1.5:LRA=11:$MEAS:linear=true,aresample=48000" -c:a pcm_s16le "$OUT"
