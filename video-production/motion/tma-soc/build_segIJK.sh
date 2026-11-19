#!/usr/bin/env bash
# Segments I to K (scenes 77, 78, 81, 82 to 90). Parts on stock are overlays rendered with --from/--to.
cd "$(dirname "$0")" && tools/build_scenes.sh segIJK.html \
  "77|full|Names and titles, delegate (graphic)" "78|full|Deputies (graphic)" \
  "81|full|Not a magic number (graphic, from 0.79 s)|0.79|21.61" \
  "82|full|14 principles, accountability (graphic, part 1)|0|22.80" \
  "82&part=overlay|overlay|check in, check out (22.77 to 30.0 s)|22.77|30.03" \
  "82|full|On scene, supports leadership (graphic, from 30.0 s)|30.0|35.99" \
  "83|full|Modular, plug in and unplug (graphic)" "84|overlay|rule of three" \
  "85|full|Fire team, squad, platoon (graphic)" "86|full|Up to the commandant (graphic)" \
  "87|full|Draw the line at three (graphic, part 1)|0|9.23" "87&part=overlay|overlay|be confident (from 9.2 s)|9.2|15.31" \
  "88|full|Recap, think about (graphic)" \
  "89|full|Learn the other modules (graphic, part 1)|0|6.93" "89&part=overlay|overlay|training and volunteering (from 6.9 s)|6.9|24.61" \
  "90&part=overlay|overlay|engage, divide, support (to 11.2 s)|0|11.23" "90|full|That's leadership (graphic, from 11.2 s)|11.2|12.95"
