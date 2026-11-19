#!/usr/bin/env bash
# Segment G (scenes 58 to 65). S65 has a full convoy section (4.0 to 9.9 s) and an overlay for the rest.
cd "$(dirname "$0")" && tools/build_scenes.sh segG.html \
  "58|full|Task force vs strike team (graphic)" "59|full|Task force, different resources (graphic)" "60|overlay|the trades" \
  "61|overlay|task force leader" "62|full|Strike team, same kind and type (graphic)" "63|full|Strike team leader (graphic)" \
  "64|overlay|utility convoy" "65&part=convoy|full|Convoy, supervisor's car (graphic, 4.0 to 9.9 s)|4.0|9.9" "65|overlay|distribute, organize, coordinate"
