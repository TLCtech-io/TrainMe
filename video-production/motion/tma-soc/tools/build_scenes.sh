#!/usr/bin/env bash
# Render scene clips from a scene page.
#   NODE_PATH=<dir with puppeteer-core> tools/build_scenes.sh <page.html> "<n>|<full|overlay>|<name>" ...
#   full    -> out/S<n> <name>.mp4 (4K H.264, the scene's length)
#   overlay -> out/S<n> overlay - <name>.mov (1080p ProRes 4444 with alpha)
#   Add "|<from>|<to>" to render part of a scene's master timeline (the name should say which part).
#   <n> may carry extra query parameters, e.g. "65&part=convoy".
# Runs three renders at a time.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
page=$1; shift
run() {
  IFS='|' read -r q kind name from to <<< "$1"
  local n=${q%%&*}   # "65&part=convoy" passes extra query parameters
  local rng=(); [ -n "${from:-}" ] && rng=(--from "$from" --to "$to")
  if [ "$kind" = full ]; then
    node ../tools/render.cjs --in "$page" --query "scene=$q" --out "out/S$n $name.mp4" --out-width 3840 --fps 30 "${rng[@]}" >/dev/null
    echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/S$n $name.mp4") out/S$n $name.mp4"
  else
    node ../tools/render.cjs --in "$page" --query "scene=$q" --alpha --fps 30 --out "out/S$n overlay - $name.mov" "${rng[@]}" >/dev/null
    echo "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/S$n overlay - $name.mov") out/S$n overlay - $name.mov"
  fi
}
i=0
for spec in "$@"; do run "$spec" & i=$((i+1)); if (( i % 3 == 0 )); then wait; fi; done
wait
