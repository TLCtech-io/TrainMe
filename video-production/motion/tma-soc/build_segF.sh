#!/usr/bin/env bash
# Segment F (scenes 48 to 57). S48 starts after a 3.44 s stock shot; S49 is two parts around a stock shot (12.47 to 16.77).
cd "$(dirname "$0")" && tools/build_scenes.sh segF.html \
  "48|full|Modular organization (graphic, from 3.44 s)|3.44|24.64" \
  "49|full|Why middle management, part 1 (graphic)|0|12.50" \
  "49|full|Why middle management, part 2 (graphic, from 16.77 s)|16.77|27.16" \
  "50|full|Where or what (graphic)" "51|overlay|two warehouses" "52|full|Divisions (graphic)" \
  "53|full|What people do, groups (graphic)" "54|overlay|specialists" "55|overlay|factory leads" \
  "56|full|Same skills, wrong team (graphic)" "57|full|Groups, nested either way (graphic)"
