#!/usr/bin/env bash
# Stand-in for the real talking-head footage so the edit can be previewed before the footage is available.
# Same length and size as the Descript base cut (50s, 1080x1920, 30fps). Silent. Shows the source timecode.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
ffmpeg -v error -y -f lavfi -i "color=c=0x2a3a48:s=1080x1920:d=1" -frames:v 1 \
  -vf "geq=r='if(lt(hypot(X-540,Y-700),170),150,if(lt(hypot((X-540)/1.55,(Y-1290)),330)*lt(Y,1500),150,52))':g='if(lt(hypot(X-540,Y-700),170),160,if(lt(hypot((X-540)/1.55,(Y-1290)),330)*lt(Y,1500),160,66))':b='if(lt(hypot(X-540,Y-700),170),170,if(lt(hypot((X-540)/1.55,(Y-1290)),330)*lt(Y,1500),170,82))'" \
  assets/placeholder-still.png
ffmpeg -v error -y -loop 1 -framerate 30 -i assets/placeholder-still.png -f lavfi -i anullsrc=r=48000:cl=stereo -t 50 \
  -vf "drawtext=fontfile=$FONT:text='PLACEHOLDER FOOTAGE':fontcolor=white@0.85:fontsize=54:x=(w-tw)/2:y=1560,\
drawtext=fontfile=$FONT:text='source %{pts\:hms}':fontcolor=white@0.7:fontsize=44:x=(w-tw)/2:y=1640,\
drawbox=enable='between(t,37,39.64)':x=0:y=0:w=iw:h=ih:color=0x6b4f2a@1:t=fill,\
drawtext=enable='between(t,37,39.64)':fontfile=$FONT:text='CEILING LEAK PHOTO':fontcolor=white:fontsize=64:x=(w-tw)/2:y=900" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -g 30 -c:a aac -shortest assets/base.mp4
echo "wrote assets/base.mp4 (placeholder)"
