#!/usr/bin/env bash
# Segment E (scenes 42 to 47). Scene 46 is the user's topic card 3, copied in Descript.
cd "$(dirname "$0")" && tools/build_scenes.sh segE.html \
  "42|full|Take all nine into account (graphic)" "43|full|Rule of thumb, fix it (graphic)" \
  "44|full|Span of control applies to things (graphic)" "45|overlay|know your limits" "47|full|Tip 1, create middle management (graphic)"
