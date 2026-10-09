#!/usr/bin/env bash
# Synthesizes a small SFX kit locally (no API). Stand-in for the playbook's ElevenLabs kit; swap files in sfx/ to upgrade.
# Every file is peak-normalized to -3 dBFS so the mix volumes in tools/mix.mjs behave predictably.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p sfx
gen() { # name duration expression [extra filters]
  ffmpeg -v error -y -f lavfi -i "aevalsrc=exprs='$3':s=48000:d=$2" -af "${4:-anull}" -ac 2 "sfx/$1.raw.wav"
  local peak; peak=$(ffmpeg -i "sfx/$1.raw.wav" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB/\1/p')
  ffmpeg -v error -y -i "sfx/$1.raw.wav" -af "volume=$(awk -v p="$peak" 'BEGIN{print -3 - p}')dB" "sfx/$1.wav"
  rm "sfx/$1.raw.wav"
}
gen whoosh 0.45 '(random(0)*2-1)*pow(sin(PI*t/0.45),2)' 'bandpass=f=1600:width_type=o:w=2.5,afade=t=out:st=0.35:d=0.1'
gen whip   0.25 '(random(0)*2-1)*pow(sin(PI*t/0.25),3)' 'highpass=f=1800,lowpass=f=9000'
gen pop    0.12 'sin(2*PI*(420+1600*t)*t)*exp(-t*38)'
gen tick   0.05 'sin(2*PI*2600*t)*exp(-t*140)'
gen stamp  0.50 '0.8*sin(2*PI*62*t)*exp(-t*10)+0.5*(random(0)*2-1)*exp(-t*45)' 'lowpass=f=3200'
gen impact 1.00 '0.8*sin(2*PI*48*t)*exp(-t*4)+0.4*sin(2*PI*96*t)*exp(-t*7)+0.35*(random(0)*2-1)*exp(-t*30)' 'lowpass=f=2500'
gen ding   1.20 '0.5*sin(2*PI*1318.5*t)*exp(-t*3.5)+0.25*sin(2*PI*2637*t)*exp(-t*6)+0.15*sin(2*PI*1975.5*t)*exp(-t*5)'
gen drip   0.16 'sin(2*PI*(1500-5000*t)*t)*exp(-t*28)'
ls sfx
