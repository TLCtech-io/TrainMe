#!/usr/bin/env bash
# Synthesizes the SFX kit locally (no API): the Vid 5 kit plus the sounds this video needs (thermostat beep, fan
# click and hum, padlock, power-down, calendar thud, heat shimmer). Each file is peak-normalized to -3 dBFS so the
# volumes in tools/mix.mjs behave predictably.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p sfx
gen() { # name duration expression [extra filters]
  ffmpeg -v error -y -f lavfi -i "aevalsrc=exprs='$3':s=48000:d=$2" -af "${4:-anull}" -ac 2 "sfx/$1.raw.wav"
  local peak; peak=$(ffmpeg -i "sfx/$1.raw.wav" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB/\1/p')
  ffmpeg -v error -y -i "sfx/$1.raw.wav" -af "volume=$(awk -v p="$peak" 'BEGIN{print -3 - p}')dB" "sfx/$1.wav"
  rm "sfx/$1.raw.wav"
}
gen whoosh   0.45 '(random(0)*2-1)*pow(sin(PI*t/0.45),2)' 'bandpass=f=1600:width_type=o:w=2.5,afade=t=out:st=0.35:d=0.1'
gen soft     0.60 '(random(0)*2-1)*pow(sin(PI*t/0.6),2)' 'bandpass=f=900:width_type=o:w=2,lowpass=f=2500'
gen pop      0.12 'sin(2*PI*(420+1600*t)*t)*exp(-t*38)'
gen tick     0.05 'sin(2*PI*2600*t)*exp(-t*140)'
gen stamp    0.50 '0.8*sin(2*PI*62*t)*exp(-t*10)+0.5*(random(0)*2-1)*exp(-t*45)' 'lowpass=f=3200'
gen ding     1.20 '0.5*sin(2*PI*1318.5*t)*exp(-t*3.5)+0.25*sin(2*PI*2637*t)*exp(-t*6)+0.15*sin(2*PI*1975.5*t)*exp(-t*5)'
gen beep     0.34 'sin(2*PI*1975*t)*(lt(t,0.09)+between(t,0.17,0.26))*0.8' 'afade=t=in:d=0.004,lowpass=f=6000'
gen click    0.06 '(random(0)*2-1)*exp(-t*220)+0.6*sin(2*PI*1400*t)*exp(-t*160)' 'highpass=f=500'
gen hum      1.20 '(0.55*sin(2*PI*118*t)+0.3*sin(2*PI*236*t)+0.25*(random(0)*2-1))*min(t/0.25,1)*min((1.2-t)/0.3,1)' 'lowpass=f=900'
gen lock     0.30 '(random(0)*2-1)*(exp(-t*260)+0.9*exp(-(t-0.11)*300)*gte(t,0.11))+0.5*sin(2*PI*900*t)*exp(-(t-0.11)*90)*gte(t,0.11)' 'highpass=f=400,lowpass=f=7000'
gen powerdown 1.00 '0.7*sin(2*PI*(380*t-150*t*t))*exp(-t*2.2)+0.25*(random(0)*2-1)*exp(-t*6)' 'lowpass=f=2400'
gen thud     0.70 '0.9*sin(2*PI*55*t)*exp(-t*7)+0.4*sin(2*PI*110*t)*exp(-t*12)+0.3*(random(0)*2-1)*exp(-t*50)' 'lowpass=f=1800'
gen shimmer  1.40 '(random(0)*2-1)*pow(sin(PI*t/1.4),2)*(0.6+0.4*sin(2*PI*7*t))' 'bandpass=f=5200:width_type=o:w=1.6,highpass=f=2500'
ls sfx
