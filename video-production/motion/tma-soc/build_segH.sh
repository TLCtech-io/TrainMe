#!/usr/bin/env bash
# Segment H (scenes 66 to 76).
cd "$(dirname "$0")" && tools/build_scenes.sh segH.html \
  "66|full|Units (graphic)" "67|full|Planning units (graphic)" "68|full|Report to the planning chief (graphic)" \
  "69|full|Units in every section (graphic)" "70|overlay|unit leader" "71|full|Branches (graphic)" \
  "72|full|Six units, too many (graphic)" "73|full|Service and support branches (graphic)" "74|overlay|large incident" \
  "75|full|Span kept manageable (graphic)" "76|full|Operations branches (graphic)"
